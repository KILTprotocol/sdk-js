/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'

import {
  DidVerificationKey,
  IIdentity,
  KeyRelationship,
  KeystoreSigner,
  NewDidVerificationKey,
  SubmittableExtrinsic,
  VerificationKeyType,
} from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'

import { Extrinsic } from '@polkadot/types/interfaces'
import { LightDidDetails } from '../DidDetails/LightDidDetails.js'
import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import {
  generateCreateTxFromCreationDetails,
  generateDidAuthenticatedTx,
  getAddEndpointExtrinsic,
  getAddKeyExtrinsic,
  getSetKeyExtrinsic,
} from '../Did.chain.js'

import { FullDidBuilder } from './FullDidBuilder.js'
import {
  getKiltDidFromIdentifier,
  getSigningAlgorithmForVerificationKeyType,
} from '../Did.utils.js'

function encodeVerificationKeyToAddress({
  publicKey,
  type,
}: Pick<DidVerificationKey, 'publicKey' | 'type'>): string {
  switch (type) {
    case VerificationKeyType.Ed25519:
    case VerificationKeyType.Sr25519:
      return encodeAddress(publicKey, 38)
    case VerificationKeyType.Ecdsa: {
      // Taken from https://github.com/polkadot-js/common/blob/master/packages/keyring/src/pair/index.ts#L44
      const pk = publicKey.length > 32 ? blake2AsU8a(publicKey) : publicKey
      return encodeAddress(pk, 38)
    }
    default:
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(`Unsupported key type ${type}.`)
  }
}

export type FullDidCreationCallback = (
  didCreationExtrinsic: SubmittableExtrinsic
) => Promise<void>

/**
 * A builder to batch multiple changes before a DID creation.
 */
export class FullDidCreationBuilder extends FullDidBuilder {
  protected authenticationKey: NewDidVerificationKey

  public constructor(
    api: ApiPromise,
    authenticationKey: NewDidVerificationKey
  ) {
    super(api)
    this.authenticationKey = {
      publicKey: authenticationKey.publicKey,
      type: authenticationKey.type,
    }
  }

  /**
   * Initialize a DID creation with the information contained in the provided light DID.
   *
   * All the details in the DID are marked as to-add in the resulting creation operation.
   *
   * @param api The [[ApiPromise]] object to encode/decoded types as needed.
   * @param details The [[LightDidDetails]] object.
   * @returns The builder initialized with the information contained in the light DID.
   */
  public static fromLightDidDetails(
    api: ApiPromise,
    details: LightDidDetails
  ): FullDidCreationBuilder {
    let builder = new FullDidCreationBuilder(api, details.authenticationKey)
    if (details.encryptionKey) {
      builder = builder.addEncryptionKey(details.encryptionKey)
    }
    details
      .getEndpoints()
      .reduce(
        (builderState, endpoint) => builderState.addServiceEndpoint(endpoint),
        builder
      )

    return builder
  }

  /**
   * Consume the builder and delegates to the callback the [[SubmittableExtrinsic]] containing the details of a DID creation with the provided details.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the expected DID authentication key.
   * @param submitter The KILT address of the user authorised to submit the creation operation.
   * @param callback A callback to submit the extrinsic and return the created [[FullDidDetails]] instance.
   * @param atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails.
   *
   * @returns The [[FullDidDetails]] as returned by the provided callback.
   */
  /* istanbul ignore next */
  public async buildAndSubmit(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    callback: FullDidCreationCallback,
    atomic = true
  ): Promise<FullDidDetails> {
    const extrinsic = await this.build(signer, submitter, atomic)
    await callback(extrinsic)
    const encodedAddress = encodeVerificationKeyToAddress(
      this.authenticationKey
    )
    const fetchedDidDetails = await FullDidDetails.fromChainInfo(
      getKiltDidFromIdentifier(encodedAddress, 'full')
    )
    if (!fetchedDidDetails) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Something went wrong during the creation.'
      )
    }
    return fetchedDidDetails
  }

  /**
   * Consume the builder and generate the [[SubmittableExtrinsic]] containing the details of a DID creation with the provided details.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the expected DID authentication key.
   * @param submitter The KILT address of the user authorised to submit the creation operation.
   * @param atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails. If atomic === false, the extrinsics are executed in the following order:
   *    1. DID creation with the given authentication key
   *    2. For each new key agreement key, a new `addKey` extrinsic. No guarantee is made on the order in which these keys are added.
   *    3. If present, a new `setKey` extrinsic for the attestation key.
   *    4. If present, a new `setKey` extrinsic for the delegation key.
   *    5. For each new service endpoint, a new `addEndpoint` extrinsic. No guarantee is made on the order in which these services are added.
   *
   * @returns The [[SubmittableExtrinsic]] containing the details of a DID creation with the provided details.
   */
  // TODO: Remove ignore when we can test the build function
  /* istanbul ignore next */
  public async build(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    atomic = true
  ): Promise<SubmittableExtrinsic> {
    this.checkBuilderConsumption()

    const encodedAddress = encodeVerificationKeyToAddress(
      this.authenticationKey
    )

    // This extrinsic expects signed origin, so does not have to be DID-authorized.
    const creationExtrinsic = await generateCreateTxFromCreationDetails(
      {
        authenticationKey: this.authenticationKey,
        identifier: encodedAddress,
      },
      submitter,
      signer
    )

    // Container for all the rest of the extrinsics, which must all be batched and the batch DID-authorized
    const additionalCreationExtrinsics: Extrinsic[] = []

    // Generate and push new key agreement key extrinsics
    const keyAgreementKeysExtrinsics = await Promise.all(
      [...this.newKeyAgreementKeys.values()].map((encKey) =>
        getAddKeyExtrinsic(KeyRelationship.keyAgreement, encKey)
      )
    )
    additionalCreationExtrinsics.push(...keyAgreementKeysExtrinsics)

    if (this.newAssertionKey.action === 'update') {
      additionalCreationExtrinsics.push(
        await getSetKeyExtrinsic(
          KeyRelationship.assertionMethod,
          // We are sure about its type as the action === 'update'
          this.newAssertionKey.newKey as NewDidVerificationKey
        )
      )
    }

    if (this.newDelegationKey.action === 'update') {
      additionalCreationExtrinsics.push(
        await getSetKeyExtrinsic(
          KeyRelationship.capabilityDelegation,
          // We are sure about its type as the action === 'update'
          this.newDelegationKey.newKey as NewDidVerificationKey
        )
      )
    }

    // Generate and push new service endpoint extrinsics
    const serviceEndpointExtrinsics = await Promise.all(
      [...this.newServiceEndpoints.entries()].map(([id, service]) =>
        getAddEndpointExtrinsic({ id, ...service })
      )
    )
    additionalCreationExtrinsics.push(...serviceEndpointExtrinsics)

    const batcher = atomic
      ? this.apiObject.tx.utility.batchAll
      : this.apiObject.tx.utility.batch

    // Contains the batched additional creation details
    let batchedDetailsExtrinsics: SubmittableExtrinsic | undefined
    // batchedDetailsExtrinsics = batched extrinsics if more than 1, or the only extrinsic, if any
    if (additionalCreationExtrinsics.length > 1) {
      batchedDetailsExtrinsics = batcher(additionalCreationExtrinsics)
    } else if (additionalCreationExtrinsics.length === 1) {
      batchedDetailsExtrinsics =
        additionalCreationExtrinsics.pop() as SubmittableExtrinsic
    }

    // DID-authorize the creation batch, if defined
    if (batchedDetailsExtrinsics) {
      batchedDetailsExtrinsics = await generateDidAuthenticatedTx({
        didIdentifier: encodedAddress,
        signingPublicKey: this.authenticationKey.publicKey,
        alg: getSigningAlgorithmForVerificationKeyType(
          this.authenticationKey.type
        ),
        signer,
        call: batchedDetailsExtrinsics,
        txCounter: 0,
        submitter,
      })
    }

    // If any details are present, they are batched with the creation. Otherwise, the sole creation tx is returned
    const outputTx = batchedDetailsExtrinsics
      ? batcher([creationExtrinsic, batchedDetailsExtrinsics])
      : creationExtrinsic

    this.consumed = true

    return outputTx
  }
}

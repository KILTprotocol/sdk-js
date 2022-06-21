/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'

import {
  DidVerificationKey,
  IIdentity,
  KeystoreSigner,
  NewDidVerificationKey,
  SubmittableExtrinsic,
  VerificationKeyType,
} from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'

import { LightDidDetails } from '../DidDetails/LightDidDetails.js'
import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import { generateCreateTxFromCreationDetails } from '../Did.chain.js'

import { FullDidBuilder } from './FullDidBuilder.js'
import { getKiltDidFromIdentifier } from '../Did.utils.js'

function encodeVerificationKeyToAddress({
  publicKey,
  type,
}: Pick<DidVerificationKey, 'publicKey' | 'type'>): IIdentity['address'] {
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
      throw new SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Unsupported key type ${type}.`
      )
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
   * @param api The ApiPromise object to encode/decoded types as needed.
   * @param details The [[LightDidDetails]] object.
   * @param upgradeOptions Optional.
   * @param upgradeOptions.withEncryptionKey When set to true (default) the LightDID's encryption key is added to the on-chain DID.
   * @param upgradeOptions.withServiceEndpoints When set to true the LightDID's ServiceEndpoints are added to the on-chain DID. This is strictly opt-in as there are more restrictive size limits for on-chain service records.
   * @returns The builder initialized with the information contained in the light DID.
   */
  public static fromLightDidDetails(
    api: ApiPromise,
    details: LightDidDetails,
    { withEncryptionKey = true, withServiceEndpoints = false } = {}
  ): FullDidCreationBuilder {
    let builder = new FullDidCreationBuilder(api, details.authenticationKey)
    if (withEncryptionKey && details.encryptionKey) {
      builder = builder.addEncryptionKey(details.encryptionKey)
    }
    if (withServiceEndpoints) {
      details
        .getEndpoints()
        .reduce(
          (builderState, endpoint) => builderState.addServiceEndpoint(endpoint),
          builder
        )
    }

    return builder
  }

  /**
   * Consume the builder and delegates to the callback the SubmittableExtrinsic containing the details of a DID creation with the provided details.
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
      throw new SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Something went wrong during the creation.'
      )
    }
    return fetchedDidDetails
  }

  /**
   * Consume the builder and generate the SubmittableExtrinsic containing the details of a DID creation with the provided details.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the expected DID authentication key.
   * @param submitter The KILT address of the user authorised to submit the creation operation.
   * @param _atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails. At this time, this parameter is not used for a creation operation, albeit this might change in the future.
   *
   * @returns The SubmittableExtrinsic containing the details of a DID creation with the provided details.
   */
  // TODO: Remove ignore when we can test the build function
  /* istanbul ignore next */
  public async build(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _atomic = true
  ): Promise<SubmittableExtrinsic> {
    this.checkBuilderConsumption()

    const encodedAddress = encodeVerificationKeyToAddress(
      this.authenticationKey
    )

    const outputTx = generateCreateTxFromCreationDetails(
      {
        identifier: encodedAddress,
        authenticationKey: this.authenticationKey,
        keyAgreementKeys: [...this.newKeyAgreementKeys.values()],
        assertionKey:
          this.newAssertionKey.action === 'update'
            ? this.newAssertionKey.newKey
            : undefined,
        delegationKey:
          this.newDelegationKey.action === 'update'
            ? this.newDelegationKey.newKey
            : undefined,
        serviceEndpoints: this.newServiceEndpoints.size
          ? [...this.newServiceEndpoints.entries()].map(([id, service]) => {
              return { id, ...service }
            })
          : undefined,
      },
      submitter,
      signer
    )

    this.consumed = true

    return outputTx
  }
}

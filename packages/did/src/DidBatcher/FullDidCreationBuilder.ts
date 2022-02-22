/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'
import { encodeAddress } from '@polkadot/util-crypto'

import type {
  IIdentity,
  KeystoreSigner,
  NewDidVerificationKey,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'

import { LightDidDetails } from '../DidDetails/LightDidDetails.js'
import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import { generateCreateTxFromCreationDetails } from '../Did.chain.js'

import { FullDidBuilder } from './FullDidBuilder.js'

export type FullDidCreationHandler = (
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
   * Consume the builder and delegates to the closure the [[SubmittableExtrinsic]] containing the details of a DID creation with the provided details.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the expected DID authentication key.
   * @param submitter The KILT address of the user authorised to submit the creation operation.
   * @param handler A closure to submit the extrinsic and return the created [[FullDidDetails]] instance.
   * @param atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails.
   *
   * @returns The [[FullDidDetails]] as returned by the provided closure.
   */
  /* istanbul ignore next */
  public async consumeWithHandler(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    handler: FullDidCreationHandler,
    atomic = true
  ): Promise<FullDidDetails> {
    const extrinsic = await this.consume(signer, submitter, atomic)
    await handler(extrinsic)
    const fetchedDidDetails = await FullDidDetails.fromChainInfo(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      encodeAddress(this.authenticationKey!.publicKey, 38)
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
   * @param _atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails. At this time, this parameter is not used for a creation operation, albeit this might change in the future.
   *
   * @returns The [[SubmittableExtrinsic]] containing the details of a DID creation with the provided details.
   */
  // TODO: Remove ignore when we can test the consume function
  /* istanbul ignore next */
  public async consume(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _atomic = true
  ): Promise<SubmittableExtrinsic> {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }

    this.consumed = true

    return generateCreateTxFromCreationDetails(
      {
        identifier: encodeAddress(this.authenticationKey.publicKey, 38),
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
  }
}

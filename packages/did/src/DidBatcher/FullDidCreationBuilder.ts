/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'
import { encodeAddress } from '@polkadot/util-crypto'

import {
  DidEncryptionKey,
  DidServiceEndpoint,
  IIdentity,
  KeyRelationship,
  KeystoreSigner,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { LightDidDetails } from '../DidDetails/LightDidDetails.js'

import { FullDidBuilder } from './FullDidBuilder.js'
import { generateCreateTxFromCreationDetails } from '../Did.chain.js'
import { FullDidDetails } from '../index.js'

export type FullDidCreationBuilderCreationDetails = {
  authenticationKey: NewDidVerificationKey
  encryptionKeys?: NewDidEncryptionKey[]
  attestationKey?: NewDidVerificationKey
  delegationKey?: NewDidVerificationKey
  serviceEndpoints?: DidServiceEndpoint[]
}

export type FullDidCreationHandler = (
  didCreationExtrinsic: SubmittableExtrinsic
) => Promise<void>

export class FullDidCreationBuilder extends FullDidBuilder {
  protected authenticationKey: NewDidVerificationKey

  // Marks all provided details as to-be-added to the DID. Hence, they cannot be marked for deletion in the same operation.
  public constructor(
    api: ApiPromise,
    {
      authenticationKey,
      encryptionKeys = [],
      attestationKey,
      delegationKey,
      serviceEndpoints = [],
    }: FullDidCreationBuilderCreationDetails
  ) {
    super(api)
    this.authenticationKey = {
      publicKey: authenticationKey.publicKey,
      type: authenticationKey.type,
    }

    encryptionKeys.forEach((key) => {
      this.addEncryptionKey(key)
    })
    if (attestationKey) {
      this.setAttestationKey(attestationKey)
    }
    if (delegationKey) {
      this.setDelegationKey(delegationKey)
    }
    serviceEndpoints.forEach((service) => {
      this.addServiceEndpoint(service)
    })
  }

  public static fromLightDidDetails(
    api: ApiPromise,
    details: LightDidDetails
  ): FullDidCreationBuilder {
    return new FullDidCreationBuilder(api, {
      authenticationKey: details.authenticationKey,
      encryptionKeys: details.getKeys(
        KeyRelationship.keyAgreement
      ) as DidEncryptionKey[],
      serviceEndpoints: details.getEndpoints(),
    })
  }

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

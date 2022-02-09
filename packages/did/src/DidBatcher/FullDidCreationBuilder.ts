/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// /**
//  * Copyright 2018-2021 BOTLabs GmbH.
//  *
//  * This source code is licensed under the BSD 4-Clause "Original" license
//  * found in the LICENSE file in the root directory of this source tree.
//  */

import { ApiPromise } from '@polkadot/api'
import { encodeAddress } from '@polkadot/util-crypto'

import {
  DidEncryptionKey,
  DidKey,
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

import type { DidBuilderCreationDetails } from './FullDidBuilder.js'
import { FullDidBuilder } from './FullDidBuilder.js'
import { generateCreateTxFromCreationDetails } from '../Did.chain.js'
import { FullDidDetails } from '../index.js'

export type FullDidCreationBuilderCreationDetails =
  DidBuilderCreationDetails & { authenticationKey: NewDidVerificationKey }

export type FullDidCreationHandler = (
  didCreationExtrinsic: SubmittableExtrinsic
) => Promise<void>

export class FullDidCreationBuilder extends FullDidBuilder {
  private authenticationKey: NewDidVerificationKey

  public constructor(
    api: ApiPromise,
    details: FullDidCreationBuilderCreationDetails
  ) {
    super(api, details)
    this.authenticationKey = details.authenticationKey
  }

  public static fromLightDidDetails(
    api: ApiPromise,
    details: LightDidDetails
  ): FullDidCreationBuilder {
    return new FullDidCreationBuilder(api, {
      authenticationKey: details.authenticationKey,
      keyAgreementKeys: details.getKeys(
        KeyRelationship.keyAgreement
      ) as DidEncryptionKey[],
      serviceEndpoints: details.getEndpoints(),
    })
  }

  public async consumeWithHandler(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    handler: FullDidCreationHandler
  ): Promise<FullDidDetails> {
    const extrinsic = await this.consume(signer, submitter)
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
    submitter: IIdentity['address']
  ): Promise<SubmittableExtrinsic> {
    const finalKeyAgreementKeys: Map<
      DidEncryptionKey['id'],
      NewDidEncryptionKey
    > = this.oldKeyAgreementKeys
    this.keyAgreementKeysToDelete.forEach((keyId) => {
      finalKeyAgreementKeys.delete(keyId)
    })
    ;[...this.newKeyAgreementKeys].forEach(([keyId, key]) => {
      finalKeyAgreementKeys.set(keyId, key)
    })

    const finalServiceEndpoints: Map<
      DidServiceEndpoint['id'],
      Omit<DidServiceEndpoint, 'id'>
    > = this.oldServiceEndpoints
    this.serviceEndpointsToDelete.forEach((serviceId) => {
      finalServiceEndpoints.delete(serviceId)
    })
    ;[...this.newServiceEndpoints].forEach(([serviceId, service]) => {
      finalServiceEndpoints.set(serviceId, service)
    })

    this.consumed = true

    return generateCreateTxFromCreationDetails(
      {
        identifier: encodeAddress(this.authenticationKey.publicKey, 38),
        authenticationKey: this.authenticationKey,
        keyAgreementKeys: [...finalKeyAgreementKeys.values()],
        assertionKey:
          this.newAssertionKey.action === 'update'
            ? this.newAssertionKey.newKey
            : undefined,
        delegationKey:
          this.newDelegationKey.action === 'update'
            ? this.newDelegationKey.newKey
            : undefined,
        serviceEndpoints: [...finalServiceEndpoints.entries()].map(
          ([id, service]) => {
            return { id, ...service }
          }
        ),
      },
      submitter,
      signer
    )
  }
}

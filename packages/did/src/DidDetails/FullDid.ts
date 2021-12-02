/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  IDidKey,
  IIdentity,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { ApiPromise } from '@polkadot/api'
import { Extrinsic } from '@polkadot/types/interfaces'
import { Did } from './Did'
import {
  getIdentifierFromKiltDid,
  getKiltDidFromIdentifier,
  getSignatureAlgForKeyType,
} from '../Did.utils'
import { DidCreationOptions, MapKeyToRelationship } from '../types'
import {
  generateDidAuthenticatedTx,
  queryById,
  queryLastTxCounter,
  queryServiceEndpoints,
} from '../Did.chain'
import { getKeysForExtrinsic } from './FullDidDetails.utils'

export class FullDid extends Did {
  /// The latest version for KILT full DIDs.
  public static readonly FULL_DID_LATEST_VERSION = 1

  // eslint-disable-next-line no-useless-constructor
  private constructor(creationOptions: DidCreationOptions) {
    super(creationOptions)
  }

  // This is used to re-create a full DID from the chain.
  public static async fromChainInfo(
    didIdentifier: IIdentity['address']
  ): Promise<FullDid | null> {
    const didRec = await queryById(didIdentifier)
    if (!didRec) return null
    const {
      publicKeys,
      assertionMethodKey,
      authenticationKey,
      capabilityDelegationKey,
      keyAgreementKeys,
    } = didRec

    const keyRelationships: MapKeyToRelationship = {
      [KeyRelationship.authentication]: [authenticationKey],
      [KeyRelationship.keyAgreement]: keyAgreementKeys,
    }
    if (assertionMethodKey) {
      keyRelationships[KeyRelationship.assertionMethod] = [assertionMethodKey]
    }
    if (capabilityDelegationKey) {
      keyRelationships[KeyRelationship.capabilityDelegation] = [
        capabilityDelegationKey,
      ]
    }

    const didUri = getKiltDidFromIdentifier(
      didIdentifier,
      'full',
      FullDid.FULL_DID_LATEST_VERSION
    )

    const endpoints = await queryServiceEndpoints(didUri)

    return new FullDid({
      did: didUri,
      keys: publicKeys,
      keyRelationships,
      serviceEndpoints: endpoints,
    })
  }

  public getKeysForExtrinsic(api: ApiPromise, extrinsic: Extrinsic): IDidKey[] {
    return getKeysForExtrinsic(api, this, extrinsic)
  }

  public async authorizeExtrinsic(
    extrinsic: Extrinsic,
    signer: KeystoreSigner,
    submitterAccount: IIdentity['address']
  ): Promise<SubmittableExtrinsic> {
    const { api } = await BlockchainApiConnection.getConnectionOrConnect()
    const [signingKey] = this.getKeysForExtrinsic(api, extrinsic)
    if (!signingKey) {
      throw new Error(
        `The details for did ${this.did} do not contain the required keys for this operation`
      )
    }
    return generateDidAuthenticatedTx({
      didIdentifier: getIdentifierFromKiltDid(this.did),
      signingPublicKey: signingKey.publicKeyHex,
      alg: getSignatureAlgForKeyType(signingKey.type),
      signer,
      call: extrinsic,
      txCounter: await queryLastTxCounter(this.did),
      submitter: submitterAccount,
    })
  }
}

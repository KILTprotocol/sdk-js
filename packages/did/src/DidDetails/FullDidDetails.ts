/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidKey,
  IIdentity,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { Extrinsic } from '@polkadot/types/interfaces'
import { DidDetails } from './DidDetails'
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

function defaultExtrinsicKeySelection(
  keysForExtrinsic: DidKey[]
): DidKey | null {
  return keysForExtrinsic[0] || null
}

export class FullDidDetails extends DidDetails {
  /// The latest version for KILT full DIDs.
  public static readonly FULL_DID_LATEST_VERSION = 1

  // eslint-disable-next-line no-useless-constructor
  private constructor(creationOptions: DidCreationOptions) {
    super(creationOptions)
  }

  // This is used to re-create a full DID from the chain.
  public static async fromChainInfo(
    didIdentifier: IDidIdentifier
  ): Promise<FullDidDetails | null> {
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
      FullDidDetails.FULL_DID_LATEST_VERSION
    )

    const endpoints = await queryServiceEndpoints(didUri)

    return new FullDidDetails({
      did: didUri,
      keys: publicKeys,
      keyRelationships,
      serviceEndpoints: endpoints,
    })
  }

  public getKeysForExtrinsic(extrinsic: Extrinsic): DidKey[] {
    return getKeysForExtrinsic(this, extrinsic)
  }

  public async authorizeExtrinsic(
    extrinsic: Extrinsic,
    signer: KeystoreSigner,
    submitterAccount: IDidIdentifier,
    keySelection: (
      keysForExtrinsic: DidKey[]
    ) => DidKey | null = defaultExtrinsicKeySelection
  ): Promise<SubmittableExtrinsic> {
    const signingKey = keySelection(this.getKeysForExtrinsic(extrinsic))
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

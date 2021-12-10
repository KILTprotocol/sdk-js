/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'

import type {
  DidKey,
  IDidIdentifier,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import type {
  DidCreationDetails,
  DidKeySelection,
  MapKeysToRelationship,
  PublicKeys,
  ServiceEndpoints,
} from '../types'
import { methodMapping } from './FullDidDetails.utils'
import { DidDetails } from './DidDetails'
import { getSignatureAlgForKeyType } from './DidDetails.utils'
import {
  generateDidAuthenticatedTx,
  queryDetails,
  queryNonce,
  queryServiceEndpoints,
} from '../Did.chain'
import {
  defaultDidKeySelection,
  FULL_DID_LATEST_VERSION,
  getKiltDidFromIdentifier,
} from '../Did.utils'

export class FullDidDetails extends DidDetails {
  public readonly identifier: IDidIdentifier

  private constructor({
    identifier,
    ...creationDetails
  }: DidCreationDetails & { identifier: IDidIdentifier }) {
    super(creationDetails)

    this.identifier = identifier
  }

  // This is used to re-create a full DID from the chain.
  public static async fromChainInfo(
    didIdentifier: IDidIdentifier,
    version: number = FULL_DID_LATEST_VERSION
  ): Promise<FullDidDetails | null> {
    const didRec = await queryDetails(didIdentifier)
    if (!didRec) return null

    const didUri = getKiltDidFromIdentifier(didIdentifier, 'full', version)

    const {
      publicKeys,
      assertionMethodKey,
      authenticationKey,
      capabilityDelegationKey,
      keyAgreementKeys,
    } = didRec

    const keys: PublicKeys = publicKeys.reduce((res, key) => {
      res.set(key.id, key)
      return res
    }, new Map())

    const keyRelationships: MapKeysToRelationship = {
      authentication: new Set([authenticationKey]),
      keyAgreement: new Set(keyAgreementKeys),
    }
    if (assertionMethodKey) {
      keyRelationships.assertionMethod = new Set([assertionMethodKey])
    }
    if (capabilityDelegationKey) {
      keyRelationships.capabilityDelegation = new Set([capabilityDelegationKey])
    }

    const serviceEndpoints: ServiceEndpoints = (
      await queryServiceEndpoints(didIdentifier)
    ).reduce((res, service) => {
      res.set(service.id, service)
      return res
    }, new Map())

    return new FullDidDetails({
      identifier: didIdentifier,
      did: didUri,
      keys,
      keyRelationships,
      serviceEndpoints,
    })
  }

  public getKeysForExtrinsic(extrinsic: Extrinsic): DidKey[] {
    const callMethod = extrinsic.method
    const { section, method } = callMethod
    const keyRelationship =
      methodMapping[section][method] || methodMapping.default.default
    return keyRelationship === 'paymentAccount'
      ? []
      : this.getKeys(keyRelationship)
  }

  public async authorizeExtrinsic(
    extrinsic: Extrinsic,
    {
      signer,
      submitterAccount,
      keySelection = defaultDidKeySelection,
    }: {
      signer: KeystoreSigner
      submitterAccount: IDidIdentifier
      keySelection?: DidKeySelection
    }
  ): Promise<SubmittableExtrinsic> {
    const signingKey = keySelection(this.getKeysForExtrinsic(extrinsic))
    if (!signingKey) {
      throw new Error(
        `The details for did ${this.did} do not contain the required keys for this operation`
      )
    }
    return generateDidAuthenticatedTx({
      didIdentifier: this.identifier,
      signingPublicKey: signingKey.publicKey,
      alg: getSignatureAlgForKeyType(signingKey.type),
      signer,
      call: extrinsic,
      txCounter: await queryNonce(this.did),
      submitter: submitterAccount,
    })
  }
}

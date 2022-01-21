/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { BN } from '@polkadot/util'

import type {
  DidKey,
  IDidIdentifier,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import type {
  DidCreationDetails,
  DidKeySelectionHandler,
  MapKeysToRelationship,
  PublicKeys,
  ServiceEndpoints,
} from '../types.js'
import { methodMapping } from './FullDidDetails.utils.js'
import { DidDetails } from './DidDetails.js'
import { getSignatureAlgForKeyType } from './DidDetails.utils.js'
import {
  generateDidAuthenticatedTx,
  queryDetails,
  queryNonce,
  queryServiceEndpoints,
} from '../Did.chain.js'
import {
  defaultDidKeySelection,
  FULL_DID_LATEST_VERSION,
  getKiltDidFromIdentifier,
} from '../Did.utils.js'

// Max nonce value is (2^64) - 1
const maxNonceValue = new BN(new BN(2).pow(new BN(64))).subn(1)

export class FullDidDetails extends DidDetails {
  public readonly identifier: IDidIdentifier

  public constructor({
    identifier,
    did,
    keys,
    keyRelationships,
    serviceEndpoints = {},
  }: DidCreationDetails & { identifier: IDidIdentifier }) {
    super({ did, keys, keyRelationships, serviceEndpoints })

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
      res[key.id] = key
      return res
    }, {})

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
      res[service.id] = service
      return res
    }, {})

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
      methodMapping[section][method] ||
      methodMapping[section].default ||
      methodMapping.default.default
    return keyRelationship === 'paymentAccount'
      ? []
      : this.getKeys(keyRelationship)
  }

  public async getNextNonce(): Promise<BN> {
    const currentNonce = await queryNonce(this.identifier)
    // Wrap around the max u64 value when reached.
    // FIXME: can we do better than this? Maybe we could expose an RPC function for this, to keep it consistent over time.
    return currentNonce === maxNonceValue ? new BN(0) : currentNonce.addn(1)
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
      keySelection?: DidKeySelectionHandler
    }
  ): Promise<SubmittableExtrinsic> {
    const signingKey = await keySelection(this.getKeysForExtrinsic(extrinsic))
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
      txCounter: await this.getNextNonce(),
      submitter: submitterAccount,
    })
  }
}

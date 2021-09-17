/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type {
  IDidKeyDetails,
  KeystoreSigner,
  SubmittableExtrinsic,
  ApiOrMetadata,
  CallMeta,
  IServiceDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { BN } from '@polkadot/util'
import { MapKeyToRelationship } from '../types'
import { generateDidAuthenticatedTx, queryLastTxIndex } from '../Did.chain'
import { getKeysForCall, getKeysForExtrinsic } from './FullDidDetails.utils'
import {
  getSignatureAlgForKeyType,
  getIdentifierFromKiltDid,
  parseDidUrl,
} from '../Did.utils'
import { DidDetails } from './DidDetails'

export interface FullDidDetailsCreationOpts {
  // The full DID URI, following the scheme did:kilt:<kilt_address>
  did: string
  keys: IDidKeyDetails[]
  keyRelationships: MapKeyToRelationship
  lastTxIndex: BN
  services?: IServiceDetails[]
}

function errorCheck({
  did,
  keys,
  keyRelationships,
}: Required<FullDidDetailsCreationOpts>): void {
  if (!did) {
    throw Error('did is required for FullDidDetails')
  }
  const { type } = parseDidUrl(did)
  if (type !== 'full') {
    throw Error('Only a full DID URI is allowed.')
  }
  const keyIds = new Set(keys.map((key) => key.id))
  if (keyRelationships[KeyRelationship.authentication]?.length !== 1) {
    throw Error(
      `One and only one ${KeyRelationship.authentication} key is required on FullDidDetails`
    )
  }
  const allowedKeyRelationships: string[] = [
    ...Object.values(KeyRelationship),
    'none',
  ]
  Object.keys(keyRelationships).forEach((kr) => {
    if (!allowedKeyRelationships.includes(kr)) {
      throw Error(
        `key relationship ${kr} is not recognized. Allowed: ${KeyRelationship}`
      )
    }
  })
  const keyReferences = new Set<string>(
    Array.prototype.concat(...Object.values(keyRelationships))
  )
  keyReferences.forEach((id) => {
    if (!keyIds.has(id)) throw new Error(`No key with id ${id} in "keys"`)
  })
}

export class FullDidDetails extends DidDetails {
  /// The latest version for KILT full DIDs.
  public static readonly FULL_DID_LATEST_VERSION = 1

  private lastTxIndex: BN

  constructor({
    did,
    keys,
    keyRelationships = {},
    lastTxIndex,
    services = [],
  }: FullDidDetailsCreationOpts) {
    errorCheck({
      did,
      keys,
      keyRelationships,
      services,
      lastTxIndex,
    })

    const id = getIdentifierFromKiltDid(did)
    super(did, id, services)

    this.keys = new Map(keys.map((key) => [key.id, key]))
    this.lastTxIndex = lastTxIndex
    this.keyRelationships = keyRelationships
    this.keyRelationships.none = []
    const keysWithRelationship = new Set<string>(
      Array.prototype.concat(...Object.values(keyRelationships))
    )
    this.keys.forEach((_, keyId) => {
      if (!keysWithRelationship.has(keyId)) {
        this.keyRelationships.none?.push(keyId)
      }
    })
  }

  /**
   * Gets the next nonce/transaction index required for DID authorized blockchain transactions.
   *
   * @param increment Flag indicating whether the retrieved tx index should be increased.
   * @returns A [[BN]] indicating the next transaction index.
   */
  public getNextTxIndex(increment = true): BN {
    const nextIndex = this.lastTxIndex.addn(1)
    if (increment) this.lastTxIndex = nextIndex
    return nextIndex
  }

  /**
   * Returns all the DID keys that could be used to authorize the submission of the provided call.
   *
   * @param call The call to submit.
   * @returns The set of keys that could be used to sign the call.
   */
  public getKeysForCall(call: CallMeta): IDidKeyDetails[] {
    return getKeysForCall(this, call)
  }

  /**
   * Returns all the DID keys that could be used to authorize the submission of the provided extrinsic.
   *
   * @param apiOrMetadata The node runtime information to use to retrieve the required information.
   * @param extrinsic The extrinsic to submit.
   * @returns The set of keys that could be used to sign the extrinsic.
   */
  public getKeysForExtrinsic(
    apiOrMetadata: ApiOrMetadata,
    extrinsic: Extrinsic
  ): IDidKeyDetails[] {
    return getKeysForExtrinsic(apiOrMetadata, this, extrinsic)
  }

  /**
   * Signs and returns the provided unsigned extrinsic with the right DID key, if present. Otherwise, it will return an error.
   *
   * @param extrinsic The unsigned extrinsic to sign.
   * @param signer The keystore to be used to sign the encoded extrinsic.
   * @param incrementTxIndex Flag indicating whether the DID nonce should be increased before submitting the operation or not.
   * @returns The DID-signed submittable extrinsic.
   */
  public async authorizeExtrinsic(
    extrinsic: Extrinsic,
    signer: KeystoreSigner,
    incrementTxIndex = true
  ): Promise<SubmittableExtrinsic> {
    const { api } = await BlockchainApiConnection.getConnectionOrConnect()
    const [signingKey] = this.getKeysForExtrinsic(api, extrinsic)
    if (!signingKey) {
      throw new Error(
        `The details for did ${this.did} do not contain the required keys for this operation`
      )
    }
    return generateDidAuthenticatedTx({
      didIdentifier: this.identifier,
      signingPublicKey: signingKey.publicKeyHex,
      alg: getSignatureAlgForKeyType(signingKey.type),
      signer,
      call: extrinsic,
      txCounter: this.getNextTxIndex(incrementTxIndex),
    })
  }

  /**
   * Retrieve from the chain the last used nonce for the DID.
   *
   * @returns The last used nonce.
   */
  public async refreshTxIndex(): Promise<this> {
    this.lastTxIndex = await queryLastTxIndex(this.did)
    return this
  }
}

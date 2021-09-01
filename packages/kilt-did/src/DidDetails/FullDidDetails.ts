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
  ServiceDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { BN, hexToU8a } from '@polkadot/util'
import { LightDidDetails } from './LightDidDetails'
import { MapKeyToRelationship } from '../types'
import { generateDidAuthenticatedTx, queryLastTxIndex } from '../Did.chain'
import { getKeysForCall, getKeysForExtrinsic } from './utils'
import {
  getSignatureAlgForKeyType,
  getIdentifierFromKiltDid,
} from '../Did.utils'

export interface FullDidDetailsCreationOpts {
  did: string
  keys: IDidKeyDetails[]
  keyRelationships: MapKeyToRelationship
  lastTxIndex: BN
  services?: ServiceDetails[]
}

function errorCheck({
  did,
  keys,
  keyRelationships,
}: Required<FullDidDetailsCreationOpts>): void {
  if (!did) {
    throw Error('did is required for FullDidDetails')
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

export class FullDidDetails extends LightDidDetails {
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

    // We are sure that there is one and only one authentication key because the condition is checked in `errorCheck`
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const authenticationKeyId = keyRelationships.Authentication![0]
    // Same way, we know the key exists because the match between keys and relationships is verified in `errorCheck`
    const authenticationKey = keys.filter(
      (key) => key.id === authenticationKeyId
    )[0]

    // Initialise only did and authentication key from light DID class. The rest is initialised here
    super({
      authenticationKey: {
        publicKey: hexToU8a(authenticationKey.publicKeyHex),
        type: authenticationKey.type,
      },
      services,
    })

    this.keys = new Map(keys.map((key) => [key.id, key]))
    this.lastTxIndex = lastTxIndex
    this.keyRelationships = keyRelationships
    this.keyRelationships.none = []
    const keysWithRelationship = new Set<string>(
      Array.prototype.concat(...Object.values(keyRelationships))
    )
    this.keys.forEach((_, id) => {
      if (!keysWithRelationship.has(id)) {
        this.keyRelationships.none?.push(id)
      }
    })
    this.didUri = did
    this.id = getIdentifierFromKiltDid(did)
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

  public getKeysForCall(call: CallMeta): IDidKeyDetails[] {
    return getKeysForCall(this, call)
  }

  public getKeysForExtrinsic(
    apiOrMetadata: ApiOrMetadata,
    extrinsic: Extrinsic
  ): IDidKeyDetails[] {
    return getKeysForExtrinsic(apiOrMetadata, this, extrinsic)
  }

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

  public async refreshTxIndex(): Promise<this> {
    this.lastTxIndex = await queryLastTxIndex(this.did)
    return this
  }
}

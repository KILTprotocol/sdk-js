/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type {
  KeyDetails,
  KeystoreSigner,
  SubmittableExtrinsic,
  ApiOrMetadata,
  CallMeta,
  IDidDetails,
  ServiceDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'

import { generateDidAuthenticatedTx, queryLastNonce } from '../Did.chain'
import { getKeysForCall, getKeysForExtrinsic } from './utils'
import { getIdentifierFromDid } from '../Did.utils'

export type MapKeyToRelationship = Partial<
  Record<KeyRelationship, Array<KeyDetails['id']>>
>

export interface DidDetailsCreationOpts {
  did: string
  keys: KeyDetails[]
  keyRelationships: MapKeyToRelationship
  lastTxIndex: bigint
  services?: ServiceDetails[]
}

function errorCheck({
  did,
  keys,
  keyRelationships,
}: Required<DidDetailsCreationOpts>): void {
  if (!did) {
    throw Error('did is required for DidDetails')
  }
  const keyIds = new Set(keys.map((key) => key.id))
  if (!keyRelationships[KeyRelationship.authentication]?.length) {
    throw Error(
      `At least one ${KeyRelationship.authentication} key is required on DidDetails`
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

export class DidDetails implements IDidDetails {
  public readonly did: string
  public readonly identifier: string
  protected services: ServiceDetails[]
  protected keys: Map<KeyDetails['id'], KeyDetails>
  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<KeyDetails['id']>
  }

  private lastTxIndex: bigint

  constructor({
    did,
    keys,
    keyRelationships = {},
    lastTxIndex,
    services = [],
  }: DidDetailsCreationOpts) {
    errorCheck({
      did,
      keys,
      keyRelationships,
      services,
      lastTxIndex,
    })

    this.did = did
    this.keys = new Map(keys.map((key) => [key.id, key]))
    this.lastTxIndex = lastTxIndex
    this.services = services
    this.identifier = getIdentifierFromDid(this.did)
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
  }

  public getKey(id: KeyDetails['id']): KeyDetails | undefined {
    return this.keys.get(id)
  }

  public getService(id: ServiceDetails['id']): ServiceDetails | undefined {
    return this.services.find((s) => s.id === id)
  }

  public getKeys(relationship?: KeyRelationship | 'none'): KeyDetails[] {
    if (relationship) {
      return this.getKeyIds(relationship).map((id) => this.getKey(id)!)
    }
    return [...this.keys.values()]
  }

  public getKeyIds(
    relationship?: KeyRelationship | 'none'
  ): Array<KeyDetails['id']> {
    if (relationship) {
      return this.keyRelationships[relationship] || []
    }
    return [...this.keys.keys()]
  }

  public getServices(type?: string): ServiceDetails[] {
    if (type) {
      return this.services.filter((service) => service.type === type)
    }
    return this.services
  }

  public getNextTxIndex(increment = true): BigInt {
    const nextIndex = this.lastTxIndex + BigInt(1)
    if (increment) this.lastTxIndex = nextIndex
    return nextIndex
  }

  public getKeysForCall(call: CallMeta): KeyDetails[] {
    return getKeysForCall(this, call)
  }

  public getKeysForExtrinsic(
    apiOrMetadata: ApiOrMetadata,
    extrinsic: Extrinsic
  ): KeyDetails[] {
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
      alg: signingKey.type,
      signer,
      call: extrinsic,
      txCounter: this.getNextTxIndex(incrementTxIndex),
    })
  }

  public async refetchNonce(): Promise<this> {
    this.lastTxIndex = await queryLastNonce(this.did)
    return this
  }
}

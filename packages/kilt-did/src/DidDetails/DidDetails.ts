/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { serialize, deserialize } from 'v8'
import type { KeyDetails } from '../types'
import type { IDidDetails, KeyRelationship, ServiceRecord } from './types'

export interface DidDetailsCreationOpts {
  did: string
  keys: KeyDetails[]
  keyRelationships: Record<KeyDetails['id'], KeyRelationship>
  lastTxIndex: bigint
  services?: ServiceRecord[]
}

function cloneObject<T>(x: T): T {
  return deserialize(serialize(x))
}

function errorCheck({
  keys,
  keyRelationships,
}: Required<DidDetailsCreationOpts>): void {
  const keyIds = new Set(keys.map((key) => key.id))
  const keyReferences = new Set(Object.keys(keyRelationships))
  keyReferences.forEach((id) => {
    if (!keyIds.has(id)) throw new Error(`No key with id ${id} in "keys"`)
  })
}

export class DidDetails implements IDidDetails {
  public readonly did: string
  public readonly identifier: string
  protected services: ServiceRecord[]
  protected keys: Map<KeyDetails['id'], KeyDetails>
  protected keyRelationships: Record<
    KeyRelationship | 'none',
    Array<KeyDetails['id']>
  >

  private lastTxIndex: bigint

  constructor({
    did,
    keys,
    keyRelationships,
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
    const secondColonAt = this.did.indexOf(':', this.did.indexOf(':') + 1)
    this.identifier = this.did.substring(secondColonAt + 1)
    this.keyRelationships = {
      authentication: [],
      assertionMethod: [],
      capabilityDelegation: [],
      capabilityInvocation: [],
      keyAgreement: [],
      none: [],
    }
    this.keys.forEach((_, id) => {
      this.keyRelationships[keyRelationships[id] || 'none'].push(id)
    })
  }

  public getKey(id: KeyDetails['id']): KeyDetails | undefined {
    return this.keys.get(id)
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
      return this.keyRelationships[relationship]
    }
    return [...this.keys.keys()]
  }

  public getServices(type?: string): ServiceRecord[] {
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
}

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  IDid,
  IDidKey,
  IDidServiceEndpoint,
  KeyRelationship,
} from '@kiltprotocol/types'
import { DidCreationOptions, MapKeyToRelationship } from '../types'

export abstract class Did implements IDid {
  protected didUri: IDid['did']
  protected publicKeys: Map<string, Omit<IDidKey, 'id'>> = new Map()
  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<IDidKey['id']>
  } = {}

  protected services: Map<string, Omit<IDidServiceEndpoint, 'id'>> = new Map()

  protected constructor({
    did,
    keyRelationships,
    keys,
    serviceEndpoints = [],
  }: DidCreationOptions) {
    this.didUri = did
    keys.forEach(({ id, ...details }) => {
      this.publicKeys.set(id, details)
    })
    this.keyRelationships = keyRelationships
    serviceEndpoints.forEach(({ id, ...details }) => {
      this.services.set(id, details)
    })
  }

  public get did(): string {
    return this.didUri
  }

  public getKey(id: string): IDidKey | undefined {
    const keyDetails = this.publicKeys.get(id)
    if (!keyDetails) {
      return undefined
    }
    return {
      id: `${this.didUri}#${id}`,
      ...keyDetails,
    }
  }

  public getKeys(relationship?: KeyRelationship | 'none'): IDidKey[] {
    const keyIds = relationship
      ? this.keyRelationships[relationship] || []
      : [...this.publicKeys.keys()]
    return keyIds.map((keyId) => this.getKey(keyId) as IDidKey)
  }

  public getEndpoint(id: string): IDidServiceEndpoint | undefined {
    const endpointDetails = this.services.get(id)
    if (!endpointDetails) {
      return undefined
    }
    return {
      id: `${this.didUri}#${id}`,
      ...endpointDetails,
    }
  }

  public getEndpoints(type?: string): IDidServiceEndpoint[] {
    const serviceEndpointsEntries = type
      ? [...this.services.entries()].filter(([, details]) => {
          return details.types.includes(type)
        })
      : [...this.services.entries()]

    return serviceEndpointsEntries.map(([id, details]) => {
      return { id, ...details }
    })
  }
}

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type {
  IDidDetails,
  IDidKeyDetails,
  IDidServiceEndpoint,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import type { MapKeyToRelationship } from '../types'

/**
 * An abstract instance for some details associated with a KILT DID.
 */
export abstract class DidDetails implements IDidDetails {
  // The complete DID URI, such as did:kilt:<kilt_address> for full DIDs and did:kilt:light:v1:<kilt_address>
  protected didUri: string

  // The identifier of the DID, meaning either the KILT address for full DIDs or the KILT address + the encoded authentication key type for light DIDs.
  protected id: string

  // A map from key ID to key details, which allows for efficient retrieval of a key information given its ID.
  protected keys: Map<IDidKeyDetails['id'], IDidKeyDetails> = new Map()

  // A map from key relationship type (authentication, assertion method, etc.) to key ID, which can then be used to retrieve the key details if needed.
  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<IDidKeyDetails['id']>
  } = {}

  // A map from service endpoint ID to service endpoint details.
  public services: Map<string, IDidServiceEndpoint> = new Map()

  constructor(didUri: string, id: string, services: IDidServiceEndpoint[]) {
    this.didUri = didUri
    this.id = id
    services.forEach((service) => {
      this.services.set(service.id, service)
    })
  }

  public get did(): string {
    return this.didUri
  }

  public get identifier(): string {
    return this.id
  }

  public getKey(id: IDidKeyDetails['id']): IDidKeyDetails | undefined {
    return this.keys.get(id)
  }

  public getKeys(relationship?: KeyRelationship | 'none'): IDidKeyDetails[] {
    if (relationship) {
      return this.getKeyIds(relationship).map((id) => this.getKey(id)!)
    }
    return [...this.keys.values()]
  }

  public getKeyIds(
    relationship?: KeyRelationship | 'none'
  ): Array<IDidKeyDetails['id']> {
    if (relationship) {
      return this.keyRelationships[relationship] || []
    }
    return [...this.keys.keys()]
  }

  getEndpointById(id: string): IDidServiceEndpoint | undefined {
    return this.services.get(id)
  }

  getEndpoints(): IDidServiceEndpoint[] {
    return Array.from(this.services.values())
  }

  getEndpointsByType(type: string): IDidServiceEndpoint[] {
    return this.getEndpoints().filter((service) => service.types.includes(type))
  }
}

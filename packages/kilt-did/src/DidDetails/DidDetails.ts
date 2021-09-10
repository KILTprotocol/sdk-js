/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/prefer-default-export */

import type {
  IDidDetails,
  IServiceDetails,
  IDidKeyDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { exportToDidDocument } from './DidDetails.utils'
import type {
  JsonDidDocument,
  JsonLDDidDocument,
  MapKeyToRelationship,
} from '../types'

/**
 * An abstract instance for some details associated with a KILT DID.
 */
export abstract class DidDetails implements IDidDetails {
  // The complete DID URI, such as did:kilt:<kilt_address> for full DIDs and did:kilt:light:v1:<kilt_address>
  protected didUri: string
  // The identifier of the DID, meaning either the KILT address for full DIDs or the KILT address + the encoded authentication key type for light DIDs.
  protected id: string
  // The set of service endpoints associated with the DID.
  protected services: IServiceDetails[] = []
  // A map from key ID to key details, which allows for efficient retrieval of a key information given its ID.
  protected keys: Map<IDidKeyDetails['id'], IDidKeyDetails> = new Map()
  // A map from key relationship type (authentication, assertion method, etc.) to key ID, which can then be used to retrieve the key details if needed.
  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<IDidKeyDetails['id']>
  } = {}

  constructor(didUri: string, id: string, services: IServiceDetails[]) {
    this.didUri = didUri
    this.id = id
    this.services = services
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

  public getService(id: IServiceDetails['id']): IServiceDetails | undefined {
    return this.services.find((s) => s.id === id)
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

  public getServices(type?: string): IServiceDetails[] {
    if (type) {
      return this.services.filter((service) => service.type === type)
    }
    return this.services
  }

  public toDidDocument(
    mimeType = 'application/json'
  ): JsonDidDocument | JsonLDDidDocument {
    return exportToDidDocument(this, mimeType)
  }
}

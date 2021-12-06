/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidKey,
  DidPublicKey,
  DidServiceEndpoint,
  IDidDetails,
  IDidIdentifier,
  KeyRelationship,
  KeystoreSigner,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { MapKeysToRelationship, PublicKeys, ServiceEndpoints } from '../types'
import {
  checkDidCreationDetails,
  getSignatureAlgForKeyType,
} from './DidDetails.utils'

export type DidCreationDetails = {
  did: IDidDetails['did']
  // Accepts a list of keys where the ID does not include the DID URI.
  keys: PublicKeys
  keyRelationships: MapKeysToRelationship
  // Accepts a list of service endpoints where the ID does not include the DID URI.
  serviceEndpoints: ServiceEndpoints
}

export abstract class DidDetails implements IDidDetails {
  public readonly did: IDidDetails['did']

  protected publicKeys: PublicKeys

  protected keyRelationships: MapKeysToRelationship

  protected serviceEndpoints: ServiceEndpoints

  protected constructor({
    did,
    keys,
    keyRelationships,
    serviceEndpoints = new Map(),
  }: DidCreationDetails) {
    checkDidCreationDetails({
      did,
      keys,
      keyRelationships,
      serviceEndpoints,
    })

    this.did = did
    this.publicKeys = keys
    this.keyRelationships = keyRelationships
    this.serviceEndpoints = serviceEndpoints
  }

  public abstract get identifier(): IDidIdentifier

  public getKey(id: string): DidKey | undefined {
    const keyDetails = this.publicKeys.get(id)
    if (!keyDetails) {
      return undefined
    }
    return {
      id,
      ...keyDetails,
    }
  }

  public getKeys(relationship?: KeyRelationship | 'none'): DidKey[] {
    const keyIds = relationship
      ? this.keyRelationships[relationship] || new Set()
      : new Set(this.publicKeys.keys())
    return [...keyIds].map((keyId) => this.getKey(keyId) as DidKey)
  }

  public getEndpoint(id: string): DidServiceEndpoint | undefined {
    const endpointDetails = this.serviceEndpoints.get(id)
    if (!endpointDetails) {
      return undefined
    }
    return {
      id,
      ...endpointDetails,
    }
  }

  public getEndpoints(type?: string): DidServiceEndpoint[] {
    const serviceEndpointsEntries = type
      ? [...this.serviceEndpoints.entries()].filter(([, details]) => {
          return details.types.includes(type)
        })
      : [...this.serviceEndpoints.entries()]

    return serviceEndpointsEntries.map(([id, details]) => {
      return { id, ...details }
    })
  }

  public async signPayload(
    signer: KeystoreSigner,
    payload: Uint8Array | string,
    keyId: DidKey['id']
  ): Promise<{
    keyId: DidPublicKey['id']
    alg: string
    signature: Uint8Array
  }> {
    const key = this.getKey(keyId)
    if (!key) {
      throw Error(`failed to find key with ID ${keyId} on DID (${this.did})`)
    }
    const alg = getSignatureAlgForKeyType(key.type)
    if (!alg) {
      throw new Error(`No algorithm found for key type ${key.type}`)
    }
    const { data: signature } = await signer.sign({
      publicKey: key.publicKey,
      alg,
      data: Crypto.coToUInt8(payload),
    })
    return { keyId: key.id, signature, alg }
  }
}

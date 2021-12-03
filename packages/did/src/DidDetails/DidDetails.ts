/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  IDidDetails,
  DidKey,
  DidServiceEndpoint,
  KeyRelationship,
  IDidIdentifier,
  KeystoreSigner,
  DidPublicKey,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { checkDidCreationDetails } from './DidDetails.utils'
import type { DidCreationDetails, MapKeyToRelationship } from '../types'
import { getSignatureAlgForKeyType } from '../Did.utils'

export abstract class DidDetails implements IDidDetails {
  public readonly did: IDidDetails['did']


  protected publicKeys: Map<string, Omit<DidKey, 'id'>> = new Map()

  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<DidKey['id']>
  } = {}

  protected services: Map<string, Omit<DidServiceEndpoint, 'id'>> = new Map()

  protected constructor({
    did,
    keys,
    keyRelationships,
    serviceEndpoints = [],
  }: DidCreationDetails) {
    checkDidCreationDetails({
      did,
      keys,
      keyRelationships,
      serviceEndpoints,
    })
    this.did = did
    keys.forEach(({ id, ...details }) => {
      this.publicKeys.set(id, details)
    })
    this.keyRelationships = keyRelationships
    serviceEndpoints.forEach(({ id, ...details }) => {
      this.services.set(id, details)
    })
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
      ? this.keyRelationships[relationship] || []
      : [...this.publicKeys.keys()]
    return keyIds.map((keyId) => this.getKey(keyId) as DidKey)
  }

  public getEndpoint(id: string): DidServiceEndpoint | undefined {
    const endpointDetails = this.services.get(id)
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
      ? [...this.services.entries()].filter(([, details]) => {
          return details.types.includes(type)
        })
      : [...this.services.entries()]

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

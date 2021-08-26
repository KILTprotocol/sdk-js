/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDidKeyDetails,
  IDidDetails,
  ServiceDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { BN, BN_ZERO } from '@polkadot/util'
import { EncryptionAlgorithms } from '..'
import { getIdentifierFromDid } from '../Did.utils'
import { MapKeyToRelationship } from '../types'

export interface LightDidDetailsCreationOpts {
  did: string
  authenticationKey: IDidKeyDetails
  encryptionKey?: IDidKeyDetails
  services?: ServiceDetails[]
}

export class LightDidDetails implements IDidDetails {
  public readonly did: string
  public readonly identifier: string
  protected services: ServiceDetails[]
  protected keys: Map<IDidKeyDetails['id'], IDidKeyDetails>
  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<IDidKeyDetails['id']>
  }

  constructor({
    did,
    authenticationKey,
    encryptionKey = undefined,
    services = [],
  }: LightDidDetailsCreationOpts) {
    this.keys = new Map([[authenticationKey.id, authenticationKey]])
    this.keyRelationships = {
      Authentication: [authenticationKey.id],
    }

    if (encryptionKey) {
      this.keys[encryptionKey.id] = encryptionKey
      this.keyRelationships.KeyAgreement = [encryptionKey.id]
    }

    this.services = services

    // TODO: If at least one between encryption key and service endpoints is not undefined, generate a JSON document, serialise/encode it and append it to the DID identifier.
    this.did = did
    this.identifier = getIdentifierFromDid(this.did)
  }

  public getKey(id: IDidKeyDetails['id']): IDidKeyDetails | undefined {
    return this.keys.get(id)
  }

  public getService(id: ServiceDetails['id']): ServiceDetails | undefined {
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

  public getServices(type?: string): ServiceDetails[] {
    if (type) {
      return this.services.filter((service) => service.type === type)
    }
    return this.services
  }

  // eslint-disable-next-line class-methods-use-this
  public getNextTxIndex(): BN {
    // Not really used for off-chain DIDs
    return new BN(0)
  }
}

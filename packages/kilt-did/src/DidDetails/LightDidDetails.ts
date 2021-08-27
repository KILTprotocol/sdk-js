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
import { BN } from '@polkadot/util'
import { encodeAddress } from '@polkadot/util-crypto'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { MapKeyToRelationship } from '../types'
import { serializeAndEncodeAdditionalLightDidDetails } from './utils'

export interface LightDidDetailsCreationOpts {
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

    // TODO: to improve. This is just a PoC
    const encodedDetails = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey,
      services,
    })
    this.identifier = encodeAddress(authenticationKey.publicKeyHex, 38)
    this.did = getKiltDidFromIdentifier(this.identifier) + encodedDetails
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

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { serialize, deserialize } from 'v8'
import type { KeyDetails } from '../types'
import type {
  IDidDetails,
  ServiceRecord,
  VerificationKeyRelationship,
} from './types'

export interface DidDetailsCreationOpts {
  did: string
  keys: KeyDetails[]
  lastTxIndex: bigint
  signingKeyIds?: Record<KeyDetails['id'], VerificationKeyRelationship>
  verificationKeyIds?: Record<KeyDetails['id'], VerificationKeyRelationship>
  encryptionKeyIds?: Array<KeyDetails['id']>
  services?: ServiceRecord[]
}

function cloneObject<T>(x: T): T {
  return deserialize(serialize(x))
}

function errorCheck({
  keys,
  signingKeyIds,
  verificationKeyIds,
  encryptionKeyIds,
}: Required<DidDetailsCreationOpts>): void {
  const keyIds = new Set(keys.map((key) => key.id))
  const keyReferences = new Set([
    ...Object.keys(signingKeyIds),
    ...Object.keys(verificationKeyIds),
    ...encryptionKeyIds,
  ])
  keyReferences.forEach((id) => {
    if (!keyIds.has(id)) throw new Error(`No key with id ${id} in "keys"`)
  })
}

export class DidDetails implements IDidDetails {
  public readonly did: string
  public readonly identifier: string
  protected services: ServiceRecord[]
  protected keys: Map<KeyDetails['id'], KeyDetails>
  protected signingKeyIds: Record<KeyDetails['id'], VerificationKeyRelationship>
  protected verificationKeyIds: Record<
    KeyDetails['id'],
    VerificationKeyRelationship
  >

  protected encryptionKeyIds: Array<KeyDetails['id']>
  private lastTxIndex: bigint

  constructor({
    did,
    keys,
    signingKeyIds = {},
    verificationKeyIds = {},
    encryptionKeyIds = [],
    lastTxIndex,
    services = [],
  }: DidDetailsCreationOpts) {
    errorCheck({
      did,
      keys,
      signingKeyIds,
      verificationKeyIds,
      encryptionKeyIds,
      services,
      lastTxIndex,
    })

    this.did = did
    this.keys = new Map(keys.map((key) => [key.id, key]))
    this.lastTxIndex = lastTxIndex
    this.services = services
    this.signingKeyIds = signingKeyIds
    this.encryptionKeyIds = encryptionKeyIds
    this.verificationKeyIds = verificationKeyIds
    const secondColonAt = this.did.indexOf(':', this.did.indexOf(':') + 1)
    this.identifier = this.did.substring(secondColonAt + 1)
  }

  public getKey(id: KeyDetails['id']): KeyDetails | undefined {
    return this.keys.get(id)
  }

  public getKeys(): KeyDetails[] {
    return [...this.keys.values()]
  }

  public getKeyIds(): Array<KeyDetails['id']> {
    return [...this.keys.keys()]
  }

  public getVerificationKeyIds(
    relationship?: VerificationKeyRelationship
  ): Array<KeyDetails['id']> {
    if (relationship) {
      return Object.entries(this.verificationKeyIds)
        .filter(([, rel]) => rel === relationship)
        .map(([id]) => id)
    }
    return Object.keys(this.verificationKeyIds)
  }

  public getVerificationKeys(
    relationship?: VerificationKeyRelationship
  ): KeyDetails[] {
    return this.getVerificationKeyIds(relationship)
      .map((id) => this.getKey(id))
      .filter<KeyDetails>((key): key is KeyDetails => !!key)
  }

  public getSigningKeyIds(
    relationship?: VerificationKeyRelationship
  ): Array<KeyDetails['id']> {
    if (relationship) {
      return Object.entries(this.signingKeyIds)
        .filter(([, rel]) => rel === relationship)
        .map(([id]) => id)
    }
    return Object.keys(this.signingKeyIds)
  }

  public getSigningKeys(
    relationship?: VerificationKeyRelationship
  ): KeyDetails[] {
    return this.getSigningKeyIds(relationship)
      .map((id) => this.getKey(id))
      .filter<KeyDetails>((key): key is KeyDetails => !!key)
  }

  public getKeyAgreementKeys(): KeyDetails[] {
    return this.encryptionKeyIds
      .map((id) => this.getKey(id))
      .filter<KeyDetails>((key): key is KeyDetails => !!key)
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

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidKey,
  DidServiceEndpoint,
  KeyRelationship,
} from '@kiltprotocol/types'
import { DidDetails } from '../DidDetails/DidDetails'

export type FullDidBuilderCreationDetails = {
  keyAgreementKeys?: DidKey[]
  assertionKey?: DidKey
  delegationKey?: DidKey
  serviceEndpoints?: DidServiceEndpoint[]
}

type keyAction = {
  action: 'delete' | 'add' | 'ignore'
  newKey?: DidKey
}

export class FullDidBuilder {
  // Old key agreement key as {id -> details}
  protected oldKeyAgreementKeys: Map<DidKey['id'], Omit<DidKey, 'id'>> =
    new Map()

  // Old assertion key, if present
  protected oldAssertionKey: DidKey | undefined
  // Old delegation key, if present
  protected oldDelegationKey: DidKey | undefined
  // Old service endpoints as {id -> details}
  protected oldServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // New key agreement keys to set as {id -> details}
  protected newKeyAgreementKeys: Map<DidKey['id'], Omit<DidKey, 'id'>> =
    new Map()

  // Key agreement keys to delete, by their ID. 
  protected keyAgreementKeysToDelete: Set<DidKey['id']> = new Set()

  // Assertion key action, either ignore, update, or delete. Ignore by default.
  protected newAssertionKey: keyAction = { action: 'ignore' }
  // Delegation key action, either ignore, update, or delete. Ignore by default.
  protected newDelegationKey: keyAction = { action: 'ignore' }
  // New service endpoints to set as {id -> details}
  protected newServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // Service endpoints to delete, by their ID.
  protected serviceEndpointsToDelete: Set<DidServiceEndpoint['id']> = new Set()

  constructor(details: FullDidBuilderCreationDetails = {}) {
    details.keyAgreementKeys?.forEach(({ id, ...keyDetails }) => {
      this.oldKeyAgreementKeys.set(id, keyDetails)
    })
    this.oldAssertionKey = details.assertionKey
    this.oldDelegationKey = details.delegationKey
    details.serviceEndpoints?.forEach(({ id, ...serviceDetails }) => {
      this.oldServiceEndpoints.set(id, serviceDetails)
    })
  }

  public static fromDid(did: DidDetails): FullDidBuilder {
    const keyAgreementKeys = did.getKeys(KeyRelationship.keyAgreement)
    const assertionKeys = did.getKeys(KeyRelationship.assertionMethod)
    if (assertionKeys.length && assertionKeys.length > 1) {
      throw new Error('Did is allowed to have only 1 assertion key.')
    }
    const delegationKeys = did.getKeys(KeyRelationship.capabilityDelegation)
    if (delegationKeys.length && delegationKeys.length > 1) {
      throw new Error('Did is allowed to have only 1 delegation key.')
    }
    const serviceEndpoints = did.getEndpoints()

    return new FullDidBuilder({
      keyAgreementKeys,
      assertionKey: assertionKeys.pop(),
      delegationKey: delegationKeys.pop(),
      serviceEndpoints,
    })
  }

  public addEncryptionKey(key: DidKey): FullDidBuilder {
    return this
  }

  public removeEncryptionKey(keyId: DidKey['id']): FullDidBuilder {
    return this
  }

  public setAttestationKey(key: DidKey): FullDidBuilder {
    return this
  }

  public removeAttestationKey(): FullDidBuilder {
    return this
  }

  public setDelegationKey(key: DidKey): FullDidBuilder {
    return this
  }

  public removeDelegationKey(): FullDidBuilder {
    return this
  }

  public addServiceEndpoint(service: DidServiceEndpoint): FullDidBuilder {
    return this
  }

  public removeServiceEndpoint(
    serviceId: DidServiceEndpoint['id']
  ): FullDidBuilder {
    return this
  }
}

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'

import {
  DidKey,
  DidServiceEndpoint,
  KeyRelationship,
} from '@kiltprotocol/types'

import { DidDetails } from '../DidDetails/DidDetails.js'

export type FullDidBuilderCreationDetails = {
  keyAgreementKeys?: DidKey[]
  assertionKey?: DidKey
  delegationKey?: DidKey
  serviceEndpoints?: DidServiceEndpoint[]
}

type KeyAction = {
  action: 'delete' | 'update' | 'ignore'
  newKey?: DidKey
}

export class FullDidBuilder {
  private api: ApiPromise

  // Old key agreement key as {id -> details}
  protected oldKeyAgreementKeys: Map<DidKey['id'], Omit<DidKey, 'id'>> =
    new Map()

  // Old service endpoints as {id -> details}
  protected oldServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // Old assertion key, if present
  protected oldAssertionKey: DidKey | undefined
  // Old delegation key, if present
  protected oldDelegationKey: DidKey | undefined

  // New key agreement keys to set as {id -> details}
  protected newKeyAgreementKeys: Map<DidKey['id'], Omit<DidKey, 'id'>> =
    new Map()

  // New service endpoints to set as {id -> details}
  protected newServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // Key agreement keys to delete, by their ID.
  protected keyAgreementKeysToDelete: Set<DidKey['id']> = new Set()
  // Assertion key action, either ignore, update, or delete. Ignore by default.
  protected newAssertionKey: KeyAction = { action: 'ignore' }
  // Delegation key action, either ignore, update, or delete. Ignore by default.
  protected newDelegationKey: KeyAction = { action: 'ignore' }

  // Service endpoints to delete, by their ID.
  protected serviceEndpointsToDelete: Set<DidServiceEndpoint['id']> = new Set()

  public constructor(
    api: ApiPromise,
    details: FullDidBuilderCreationDetails = {}
  ) {
    this.api = api

    details.keyAgreementKeys?.forEach(({ id, ...keyDetails }) => {
      this.oldKeyAgreementKeys.set(id, keyDetails)
    })
    this.oldAssertionKey = details.assertionKey
    this.oldDelegationKey = details.delegationKey
    details.serviceEndpoints?.forEach(({ id, ...serviceDetails }) => {
      this.oldServiceEndpoints.set(id, serviceDetails)
    })
  }

  public static fromDid(api: ApiPromise, did: DidDetails): FullDidBuilder {
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

    return new FullDidBuilder(api, {
      keyAgreementKeys,
      assertionKey: assertionKeys.pop(),
      delegationKey: delegationKeys.pop(),
      serviceEndpoints,
    })
  }

  public addEncryptionKey(key: DidKey): FullDidBuilder {
    const { id, ...details } = key
    // 1. Check if the key is already present in the DID.
    if (this.oldKeyAgreementKeys.has(id)) {
      throw new Error(
        `Key agreement key with ID ${id} already present under the full DID.`
      )
    }
    // 2. Check if the key has already been marked for deletion.
    if (this.keyAgreementKeysToDelete.has(id)) {
      throw new Error(
        `Key agreement key with ID ${id} has already been marked for deletion and cannot be re-added in the same operation.`
      )
    }
    // Otherwise, the key is either already been marked for addition or not present, in which case we can safely
    // add it to the set of new keys.
    this.newKeyAgreementKeys.set(id, details)
    return this
  }

  public removeEncryptionKey(keyId: DidKey['id']): FullDidBuilder {
    // 1. Check that the key exists in the DID.
    if (!this.oldKeyAgreementKeys.has(keyId)) {
      throw new Error(
        `Key agreement key with ID ${keyId} not present under the full DID.`
      )
    }
    // 2. Check if the key has already been marked for addition.
    if (this.newKeyAgreementKeys.has(keyId)) {
      throw new Error(
        `Key agreement key with ID ${keyId} has already been marked for addition and cannot be deleted in the same operation.`
      )
    }
    // Otherwise, the key is either already been marked for deletion or not but it is present, in which case we can safely
    // add it to the set of keys to remove.
    this.keyAgreementKeysToDelete.add(keyId)
    return this
  }

  public setAttestationKey(key: DidKey): FullDidBuilder {
    // 1. Check that the attestation key has not already been marked for deletion.
    if (this.newAssertionKey.action === 'delete') {
      throw new Error('The assertion key has already been marked for deletion.')
    }
    this.newAssertionKey = { action: 'update', newKey: key }
    return this
  }

  public removeAttestationKey(): FullDidBuilder {
    // 1. Check that the DID has an attestation key.
    if (!this.oldAssertionKey) {
      throw new Error('The DID does not have an attestation key to remove.')
    }
    // 2. Check that a new key has not already been marked for addition.
    const { action, newKey } = this.newAssertionKey
    if (action === 'update') {
      throw new Error(
        `A new assertion key with ID ${newKey?.id} has already been marked for addition.`
      )
    }
    this.newAssertionKey = { action: 'delete' }
    return this
  }

  public setDelegationKey(key: DidKey): FullDidBuilder {
    // 1. Check that the delegation key has not already been marked for deletion.
    if (this.newDelegationKey.action === 'delete') {
      throw new Error(
        'The delegation key has already been marked for deletion.'
      )
    }
    this.newDelegationKey = { action: 'update', newKey: key }
    return this
  }

  public removeDelegationKey(): FullDidBuilder {
    // 1. Check that the DID has a delegation key.
    if (!this.oldDelegationKey) {
      throw new Error('The DID does not have a delegation key to remove.')
    }
    // 2. Check that a new key has not already been marked for addition.
    const { action, newKey } = this.newDelegationKey
    if (action === 'update') {
      throw new Error(
        `A new delegation key with ID ${newKey?.id} has already been marked for addition.`
      )
    }
    this.newAssertionKey = { action: 'delete' }
    return this
  }

  public addServiceEndpoint(service: DidServiceEndpoint): FullDidBuilder {
    const { id, ...details } = service
    // 1. Check if the service is already present in the DID.
    if (this.oldServiceEndpoints.has(id)) {
      throw new Error(
        `Service endpoint with ID ${id} already present under the full DID.`
      )
    }
    // 2. Check if the service has already been marked for deletion.
    if (this.serviceEndpointsToDelete.has(id)) {
      throw new Error(
        `Service endpoint with ID ${id} has already been marked for deletion and cannot be re-added in the same operation.`
      )
    }
    // Otherwise, the service is either already been marked for addition or not present, in which case we can safely
    // add it to the set of new service endpoints.
    this.newServiceEndpoints.set(id, details)
    return this
  }

  public removeServiceEndpoint(
    serviceId: DidServiceEndpoint['id']
  ): FullDidBuilder {
    // 1. Check that the service exists in the DID.
    if (!this.oldServiceEndpoints.has(serviceId)) {
      throw new Error(
        `Service endpoint with ID ${serviceId} not present under the full DID.`
      )
    }
    // 2. Check if the service endpoint has already been marked for addition.
    if (this.newServiceEndpoints.has(serviceId)) {
      throw new Error(
        `Service endpoint with ID ${serviceId} has already been marked for addition and cannot be deleted in the same operation.`
      )
    }
    // Otherwise, the service endpoint is either already been marked for deletion or not but it is present, in which case we can safely
    // add it to the set of service endpoints to remove.
    this.serviceEndpointsToDelete.add(serviceId)
    return this
  }
}

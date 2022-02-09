/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'

import type {
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  DidVerificationKey,
  NewDidEncryptionKey,
  NewDidVerificationKey,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { deriveChainKeyId } from './FullDidBuilder.utils.js'

export type FullDidBuilderCreationDetails = {
  keyAgreementKeys?: DidEncryptionKey[]
  assertionKey?: DidVerificationKey
  delegationKey?: DidVerificationKey
  serviceEndpoints?: DidServiceEndpoint[]
}

export type VerificationKeyAction = {
  action: 'delete' | 'update' | 'ignore'
  // newKey is defined only if action === 'update'
  newKey?: NewDidVerificationKey
}
export abstract class FullDidBuilder {
  private apiObject: ApiPromise

  // Old key agreement key as {id -> details}
  protected oldKeyAgreementKeys: Map<
    DidEncryptionKey['id'],
    Omit<DidEncryptionKey, 'id'>
  > = new Map()

  // Old service endpoints as {id -> details}
  protected oldServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // Old assertion key, if present
  protected oldAssertionKey: DidVerificationKey | undefined = undefined
  // Old delegation key, if present
  protected oldDelegationKey: DidVerificationKey | undefined = undefined

  // New key agreement keys to set as {id -> details}
  protected newKeyAgreementKeys: Map<
    DidEncryptionKey['id'],
    NewDidEncryptionKey
  > = new Map()

  // New service endpoints to set as {id -> details}
  protected newServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // Key agreement keys to delete, by their ID.
  protected keyAgreementKeysToDelete: Set<DidEncryptionKey['id']> = new Set()
  // Assertion key action, either ignore, update, or delete. Ignore by default.
  protected newAssertionKey: VerificationKeyAction = { action: 'ignore' }
  // Delegation key action, either ignore, update, or delete. Ignore by default.
  protected newDelegationKey: VerificationKeyAction = { action: 'ignore' }

  // Service endpoints to delete, by their ID.
  protected serviceEndpointsToDelete: Set<DidServiceEndpoint['id']> = new Set()

  private consumed = false

  public constructor(
    api: ApiPromise,
    details: FullDidBuilderCreationDetails = {}
  ) {
    details.keyAgreementKeys?.forEach(({ id, ...keyDetails }) => {
      this.oldKeyAgreementKeys.set(id, keyDetails)
    })
    this.oldAssertionKey = details.assertionKey
    this.oldDelegationKey = details.delegationKey
    details.serviceEndpoints?.forEach(({ id, ...serviceDetails }) => {
      this.oldServiceEndpoints.set(id, serviceDetails)
    })
    this.apiObject = api
  }

  public addEncryptionKey(key: NewDidEncryptionKey): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    const newKeyId = deriveChainKeyId(this.apiObject, key)
    // 1. Check if the key is already present in the DID.
    if (this.oldKeyAgreementKeys.has(newKeyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${newKeyId} already present under the full DID.`
      )
    }
    // 2. Check if the key has already been marked for deletion.
    if (this.keyAgreementKeysToDelete.has(newKeyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${newKeyId} has already been marked for deletion and cannot be re-added in the same operation.`
      )
    }
    // 3. Check if a key with the same ID has already been added.
    if (this.newKeyAgreementKeys.has(newKeyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${newKeyId} has already been marked for addition. Failing since this may lead to unexpected behaviour.`
      )
    }
    // Otherwise we can safely mark the key for addition.
    this.newKeyAgreementKeys.set(newKeyId, key)
    return this
  }

  public removeEncryptionKey(keyId: DidKey['id']): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that the key exists in the DID.
    if (!this.oldKeyAgreementKeys.has(keyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${keyId} not present under the full DID.`
      )
    }
    // 2. Check if the key has already been marked for addition.
    if (this.newKeyAgreementKeys.has(keyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${keyId} has already been marked for addition and cannot be deleted in the same operation.`
      )
    }
    // 3. Check if the key has already been marked for deletion.
    if (this.keyAgreementKeysToDelete.has(keyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${keyId} has already been marked for deletion. Failing since this may lead to unexpected behaviour.`
      )
    }
    // Otherwise we can safely mark the key for removal.
    this.keyAgreementKeysToDelete.add(keyId)
    return this
  }

  public setAttestationKey(key: NewDidVerificationKey): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that the attestation key has not already been marked for deletion.
    if (this.newAssertionKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The assertion key has already been marked for deletion.'
      )
    }
    // 2. Check if another attestation key was already marked for addition.
    if (this.newAssertionKey.action === 'update') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Another assertion key was already been marked for addition. Failing since this may lead to unexpected behaviour.'
      )
    }
    this.newAssertionKey = { action: 'update', newKey: key }
    return this
  }

  public removeAttestationKey(): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that the DID has an attestation key.
    if (!this.oldAssertionKey) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The DID does not have an attestation key to remove.'
      )
    }
    // 2. Check if another attestation key was already marked for addition.
    if (this.newAssertionKey.action === 'update') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'A new assertion key has already been marked for addition.'
      )
    }
    // 3. Check that the old key has not already been marked for deletion.
    if (this.newAssertionKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Another assertion key was already been marked for deletion. Failing since this may lead to unexpected behaviour.'
      )
    }
    this.newAssertionKey = { action: 'delete' }
    return this
  }

  public setDelegationKey(key: NewDidVerificationKey): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that the delegation key has not already been marked for deletion.
    if (this.newDelegationKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The delegation key has already been marked for deletion.'
      )
    }
    // 2. Check if another delegation key was already marked for addition.
    if (this.newDelegationKey.action === 'update') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Another delegation key was already been marked for addition. Failing since this may lead to unexpected behaviour.'
      )
    }
    this.newDelegationKey = { action: 'update', newKey: key }
    return this
  }

  public removeDelegationKey(): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that the DID has a delegation key.
    if (!this.oldDelegationKey) {
      throw new Error('The DID does not have a delegation key to remove.')
    }
    // 2. Check that a new key has not already been marked for addition.
    if (this.newDelegationKey.action === 'update') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'A new delegation key has already been marked for addition.'
      )
    }
    // 3. Check that the old key has not already been marked for deletion.
    if (this.newDelegationKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Another delegation key was already been marked for deletion. Failing since this may lead to unexpected behaviour.'
      )
    }
    this.newDelegationKey = { action: 'delete' }
    return this
  }

  public addServiceEndpoint(service: DidServiceEndpoint): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    const { id, ...details } = service
    // 1. Check if the service is already present in the DID.
    if (this.oldServiceEndpoints.has(id)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Service endpoint with ID ${id} already present under the DID.`
      )
    }
    // 2. Check if the service has already been added.
    if (this.newServiceEndpoints.has(id)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Service endpoint with ID ${id} has already been marked for addition. Failing since this may lead to unexpected behaviour.`
      )
    }
    // Otherwise we can safely mark the service endpoint for addition.
    this.newServiceEndpoints.set(id, details)
    return this
  }

  public removeServiceEndpoint(
    serviceId: DidServiceEndpoint['id']
  ): FullDidBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that the service exists in the DID.
    if (!this.oldServiceEndpoints.has(serviceId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Service endpoint with ID ${serviceId} not present under the full DID.`
      )
    }
    // 2. Check if the service has already been marked for deletion.
    if (this.serviceEndpointsToDelete.has(serviceId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Service endpoint with ID ${serviceId} has already been marked for deletion. Failing since this may lead to unexpected behaviour.`
      )
    }
    // Otherwise we can safely mark the service endpoint for deletion.
    this.serviceEndpointsToDelete.add(serviceId)
    return this
  }

  protected consume(): void {
    this.consumed = true
  }
}

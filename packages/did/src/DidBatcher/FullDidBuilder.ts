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
  DidServiceEndpoint,
  IIdentity,
  KeystoreSigner,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { deriveChainKeyId } from './FullDidBuilder.utils.js'

export type VerificationKeyAction = {
  action: 'delete' | 'update' | 'ignore'
  // newKey is defined only if action === 'update'
  newKey?: NewDidVerificationKey
}

/**
 * An abstract class for DID builders. A DID builder collects and batches multiple DID operations in the same blockchain transaction.
 *
 * Concrete classes must subclass this one in order to provide the desired functionality, as is the case with [[FullDidCreationBuilder]] and [[FullDidUpdateBuilder]] handling DID creation and DID updates respectively.
 */
export abstract class FullDidBuilder {
  protected apiObject: ApiPromise

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

  // Assertion key action, either ignore, update, or delete. Ignore by default.
  protected newAssertionKey: VerificationKeyAction = { action: 'ignore' }
  // Delegation key action, either ignore, update, or delete. Ignore by default.
  protected newDelegationKey: VerificationKeyAction = { action: 'ignore' }

  protected consumed = false

  public constructor(api: ApiPromise) {
    this.apiObject = api
  }

  /**
   * Mark a new encryption key to be added to the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - There was already a key with the same ID marked for addition.
   *
   * @param key The new [[NewDidEncryptionKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public addEncryptionKey(key: NewDidEncryptionKey): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    const newKeyId = deriveChainKeyId(this.apiObject, key)
    // Check if a key with the same ID has already been added.
    if (this.newKeyAgreementKeys.has(newKeyId)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Key agreement key with ID ${newKeyId} has already been marked for addition. Failing since this may lead to unexpected behaviour.`
      )
    }
    // Otherwise we can safely mark the key for addition.
    this.newKeyAgreementKeys.set(newKeyId, {
      publicKey: key.publicKey,
      type: key.type,
    })
    return this
  }

  /**
   * Mark a new attestation key to replace the old one, if present, in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - There was already a new attestation key marked for addition.
   *
   * @param key The new [[NewDidVerificationKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public setAttestationKey(key: NewDidVerificationKey): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // Check if another attestation key was already marked for addition.
    if (this.newAssertionKey.action === 'update') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Another assertion key was already been marked for addition. Failing since this may lead to unexpected behaviour.'
      )
    }
    this.newAssertionKey = {
      action: 'update',
      newKey: { publicKey: key.publicKey, type: key.type },
    }
    return this
  }

  /**
   * Mark a new delegation key to replace the old one, if present, in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - There was already a new delegation key marked for addition.
   *
   * @param key The new [[NewDidVerificationKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public setDelegationKey(key: NewDidVerificationKey): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // Check if another delegation key was already marked for addition.
    if (this.newDelegationKey.action === 'update') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Another delegation key was already been marked for addition. Failing since this may lead to unexpected behaviour.'
      )
    }
    this.newDelegationKey = {
      action: 'update',
      newKey: { publicKey: key.publicKey, type: key.type },
    }
    return this
  }

  /**
   * Mark a new service endpoint to be added to the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - There was already a service with the same ID marked for addition.
   *
   * @param service The new [[DidServiceEndpoint]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public addServiceEndpoint(service: DidServiceEndpoint): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    const { id, ...details } = service
    // Check if the service has already been added.
    if (this.newServiceEndpoints.has(id)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Service endpoint with ID ${id} has already been marked for addition. Failing since this may lead to unexpected behaviour.`
      )
    }
    // Otherwise we can safely mark the service endpoint for addition.
    this.newServiceEndpoints.set(id, {
      types: details.types,
      urls: details.urls,
    })
    return this
  }

  /* istanbul ignore next */
  public abstract consume(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    atomic: boolean
  ): Promise<SubmittableExtrinsic | null>
}

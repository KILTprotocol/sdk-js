/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api'

import type {
  DidEncryptionKey,
  KeystoreSigner,
  IIdentity,
  IDidIdentifier,
  DidVerificationKey,
  NewDidVerificationKey,
  NewDidEncryptionKey,
  DidServiceEndpoint,
  DidKey,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import { increaseNonce } from '../DidDetails/FullDidDetails.utils.js'
import {
  formatPublicKey,
  generateDidAuthenticatedTx,
  queryNonce,
} from '../Did.chain.js'
import { getSigningAlgorithmForVerificationKeyType } from '../Did.utils.js'

import { FullDidBuilder } from './FullDidBuilder.js'
import { deriveChainKeyId } from './FullDidBuilder.utils.js'

export type FullDidUpdateBuilderCreationDetails = {
  authenticationKey: DidVerificationKey
  identifier: IDidIdentifier
  keyAgreementKeys?: DidEncryptionKey[]
  assertionKey?: DidVerificationKey
  delegationKey?: DidVerificationKey
  serviceEndpoints?: DidServiceEndpoint[]
}

export type FullDidUpdateHandler = (
  didUpdateExtrinsicBatch: SubmittableExtrinsic
) => Promise<void>

// TODO: replace manual extrinsic creation with DID chain functions when those will take an api object as parameter, so that they do not have to be async.

/**
 * A builder to batch multiple changes before a DID update.
 */
export class FullDidUpdateBuilder extends FullDidBuilder {
  protected identifier: IDidIdentifier
  protected batch: Extrinsic[] = []

  protected oldAuthenticationKey: DidVerificationKey
  protected newAuthenticationKey: NewDidVerificationKey | undefined = undefined

  // Old key agreement key as {id -> details}
  protected oldKeyAgreementKeys: Map<
    DidEncryptionKey['id'],
    Omit<DidEncryptionKey, 'id'>
  > = new Map()

  // Key agreement keys to delete, by their ID.
  protected keyAgreementKeysToDelete: Set<DidEncryptionKey['id']> = new Set()

  // Old assertion key, if present
  protected oldAssertionKey: DidVerificationKey | undefined = undefined
  // Old delegation key, if present
  protected oldDelegationKey: DidVerificationKey | undefined = undefined

  // Old service endpoints as {id -> details}
  protected oldServiceEndpoints: Map<
    DidServiceEndpoint['id'],
    Omit<DidServiceEndpoint, 'id'>
  > = new Map()

  // Service endpoints to delete, by their ID.
  protected serviceEndpointsToDelete: Set<DidServiceEndpoint['id']> = new Set()

  /**
   * Initialize a DID update with the information contained in the provided full DID.
   *
   * @param api The [[ApiPromise]] object to encode/decoded types as needed.
   * @param details The [[FullDidDetails]] object.
   */
  public constructor(api: ApiPromise, details: FullDidDetails) {
    super(api)

    this.identifier = details.identifier
    this.oldAuthenticationKey = details.authenticationKey
    this.oldAssertionKey = details.attestationKey
    this.oldDelegationKey = details.delegationKey

    details
      .getEncryptionKeys(KeyRelationship.keyAgreement)
      .forEach(({ id, ...keyDetails }) =>
        this.oldKeyAgreementKeys.set(id, keyDetails)
      )
    details
      .getEndpoints()
      .forEach(({ id, ...serviceDetails }) =>
        this.oldServiceEndpoints.set(id, serviceDetails)
      )
  }

  /**
   * Mark a new authentication key to replace the old one in the next DID operation.
   *
   * All update operations after this function is called are batched and signed with the new authentication key.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - There was already a new authentication key marked for addition.
   *
   * @param key The new [[NewDidVerificationKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public setAuthenticationKey(key: NewDidVerificationKey): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // Check that no other authentication key has already been set.
    if (this.newAuthenticationKey) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'A new authentication key has already been marked for addition.'
      )
    }

    const extrinsic = this.apiObject.tx.did.setAuthenticationKey(
      formatPublicKey(key)
    )

    this.batch.push(extrinsic)
    this.newAuthenticationKey = key

    return this
  }

  /**
   * Mark a new encryption key to be added in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The starting state already has the provided encryption key
   *   - There was already a key with the same ID marked for deletion.
   *   - The builder has already been consumed
   *   - There was already a key with the same ID marked for addition.
   *
   * @param key The new [[NewDidEncryptionKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public addEncryptionKey(key: NewDidEncryptionKey): this {
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
    const extrinsic = this.apiObject.tx.did.addKeyAgreementKey(
      formatPublicKey(key)
    )

    super.addEncryptionKey(key)
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark an encryption key to be removed in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - The starting state does not have a key with the provided ID
   *   - There was already a key with the same ID marked for addition.
   *   - There was already a key with the same ID marked for deletion.
   *
   * @param keyId The ID of the encryption key to delete.
   * @returns The builder with the provided operation saved internally.
   */
  public removeEncryptionKey(keyId: DidKey['id']): this {
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
    const extrinsic = this.apiObject.tx.did.removeKeyAgreementKey(keyId)

    // Otherwise we can safely mark the key for removal.
    this.keyAgreementKeysToDelete.add(keyId)
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark all encryption keys in the provided DID to be removed in the next DID operation.
   *
   * It calls internally `removeEncryptionKey` for each encryption key.
   *
   * @returns The builder with the provided operation saved internally.
   */
  public removeAllEncryptionKeys(): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }

    ;[...this.oldKeyAgreementKeys.keys()].forEach((kId) => {
      this.removeEncryptionKey(kId)
    })

    return this
  }

  /**
   * Mark a new attestation key to replace the old one, if present, in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The old attestation key was already marked for deletion.
   *   - The builder has already been consumed
   *   - There was already a new attestation key marked for addition.
   *
   * @param key The new [[NewDidVerificationKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public setAttestationKey(key: NewDidVerificationKey): this {
    // Check that the attestation key has not already been marked for deletion.
    if (this.newAssertionKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The assertion key has already been marked for deletion.'
      )
    }
    const extrinsic = this.apiObject.tx.did.setAttestationKey(
      formatPublicKey(key)
    )

    super.setAttestationKey(key)
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark the attestation key to be removed in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - The starting state does not have an attestation key
   *   - There was already an attestation key marked for addition
   *   - The old attestation key was already marked for deletion.
   *
   * @returns The builder with the provided operation saved internally.
   */
  public removeAttestationKey(): this {
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

    const extrinsic = this.apiObject.tx.did.removeAttestationKey()

    this.newAssertionKey = { action: 'delete' }
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark a new delegation key to replace the old one, if present, in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The old delegation key was already marked for deletion.
   *   - The builder has already been consumed
   *   - There was already a new delegation key marked for addition.
   *
   * @param key The new [[NewDidVerificationKey]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public setDelegationKey(key: NewDidVerificationKey): this {
    // Check that the delegation key has not already been marked for deletion.
    if (this.newDelegationKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The delegation key has already been marked for deletion.'
      )
    }
    const extrinsic = this.apiObject.tx.did.setDelegationKey(
      formatPublicKey(key)
    )

    super.setDelegationKey(key)
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark the delegation key to be removed in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - The starting state does not have an delegation key
   *   - There was already an attestation key marked for addition
   *   - The old attestation key was already marked for deletion.
   *
   * @returns The builder with the provided operation saved internally.
   */
  public removeDelegationKey(): this {
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
    const extrinsic = this.apiObject.tx.did.removeDelegationKey()

    this.newDelegationKey = { action: 'delete' }
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark a new service endpoint to be added in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The starting state already has the provided service endpoint
   *   - There was already a service with the same ID marked for deletion.
   *   - The builder has already been consumed
   *   - There was already a service with the same ID marked for addition.
   *
   * @param service The new [[DidServiceEndpoint]] to add to the DID.
   * @returns The builder with the provided operation saved internally.
   */
  public addServiceEndpoint(service: DidServiceEndpoint): this {
    // Check if the service is already present in the DID.
    if (this.oldServiceEndpoints.has(service.id)) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        `Service endpoint with ID ${service.id} already present under the DID.`
      )
    }
    const extrinsic = this.apiObject.tx.did.addServiceEndpoint({
      serviceTypes: service.types,
      ...service,
    })

    super.addServiceEndpoint(service)
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark an service endpoint to be removed in the next DID operation.
   *
   * The operation will fail in the following cases:
   *   - The builder has already been consumed
   *   - The starting state does not have a service with the provided ID
   *   - There was already a service with the same ID marked for addition.
   *   - There was already a service with the same ID marked for deletion.
   *
   * @param serviceId The ID of the service to delete.
   * @returns The builder with the provided operation saved internally.
   */
  public removeServiceEndpoint(serviceId: DidServiceEndpoint['id']): this {
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
    const extrinsic = this.apiObject.tx.did.removeServiceEndpoint(serviceId)

    // Otherwise we can safely mark the service endpoint for deletion.
    this.serviceEndpointsToDelete.add(serviceId)
    this.batch.push(extrinsic)

    return this
  }

  /**
   * Mark all service endpoints in the provided DID to be removed in the next DID operation.
   *
   * It calls internally `removeServiceEndpoint` for each service endpoint.
   *
   * @returns The builder with the provided operation saved internally.
   */
  public removeAllServiceEndpoints(): this {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }

    ;[...this.oldServiceEndpoints.keys()].forEach((sId) => {
      this.removeServiceEndpoint(sId)
    })

    return this
  }

  /**
   * Consume the builder and delegates to the closure the [[SubmittableExtrinsic]] containing the details of a DID update with the provided details.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the expected DID authentication key, and optionally the new one if a new one is set in the update.
   * @param submitter The KILT address of the user authorised to submit the update operation.
   * @param handler A closure to submit the extrinsic and return the update [[FullDidDetails]] instance.
   * @param atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails.
   *
   * @returns The [[FullDidDetails]] as returned by the provided closure.
   */
  /* istanbul ignore next */
  public async consumeWithHandler(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    handler: FullDidUpdateHandler,
    atomic = true
  ): Promise<FullDidDetails> {
    const extrinsic = await this.consume(signer, submitter, atomic)
    await handler(extrinsic)
    const fetchedDidDetails = await FullDidDetails.fromChainInfo(
      this.identifier
    )
    if (!fetchedDidDetails) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Something went wrong during the creation.'
      )
    }
    return fetchedDidDetails
  }

  /**
   * Consume the builder and generate the [[SubmittableExtrinsic]] containing the details of the DID update with the provided details.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the expected DID authentication key, and optionally the new one if a new one is set in the update.
   * @param submitter The KILT address of the user authorised to submit the update operation.
   * @param atomic A boolean flag indicating whether the whole state must be reverted in case any operation in the batch fails.
   *
   * @returns The [[SubmittableExtrinsic]] containing the details of a DID update with the provided details.
   */
  // TODO: Remove ignore when we can test the consume function
  /* istanbul ignore next */
  public async consume(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    atomic = true
  ): Promise<SubmittableExtrinsic> {
    const batchFunction = atomic
      ? this.apiObject.tx.utility.batchAll
      : this.apiObject.tx.utility.batch

    if (!this.batch.length) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Builder was empty, hence it cannot be consumed.'
      )
    }

    const batch =
      this.batch.length > 1 ? batchFunction(this.batch) : this.batch[0]

    const lastDidNonce = await queryNonce(this.identifier)

    return generateDidAuthenticatedTx({
      didIdentifier: this.identifier,
      signingPublicKey: this.oldAuthenticationKey.publicKey,
      alg: getSigningAlgorithmForVerificationKeyType(
        this.oldAuthenticationKey.type
      ),
      signer,
      call: batch,
      txCounter: increaseNonce(lastDidNonce),
      submitter,
    })
  }
}

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'

import {
  KeyRelationship,
  DidEncryptionKey,
  KeystoreSigner,
  SubmittableExtrinsic,
  IIdentity,
  IDidIdentifier,
  DidVerificationKey,
  NewDidVerificationKey,
  NewDidEncryptionKey,
  DidServiceEndpoint,
  DidKey,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { DidChain, FullDidDetails } from '../index.js'
import { FullDidBuilder } from './FullDidBuilder.js'
import { formatPublicKey, generateDidAuthenticatedTx } from '../Did.chain.js'
import { getSignatureAlgForKeyType } from '../Did.utils.js'
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
export class FullDidUpdateBuilder extends FullDidBuilder<FullDidUpdateBuilder> {
  protected identifier: IDidIdentifier
  protected firstBatch: SubmittableExtrinsic[] = []
  protected secondBatch: SubmittableExtrinsic[] = []

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

  public constructor(
    api: ApiPromise,
    {
      authenticationKey,
      identifier,
      keyAgreementKeys = [],
      assertionKey,
      delegationKey,
      serviceEndpoints = [],
    }: FullDidUpdateBuilderCreationDetails
  ) {
    super(api)
    this.oldAuthenticationKey = authenticationKey
    this.identifier = identifier
    keyAgreementKeys.forEach(({ id, ...keyDetails }) => {
      this.oldKeyAgreementKeys.set(id, keyDetails)
    })
    this.oldAssertionKey = assertionKey
    this.oldDelegationKey = delegationKey
    serviceEndpoints.forEach(({ id, ...serviceDetails }) => {
      this.oldServiceEndpoints.set(id, serviceDetails)
    })
  }

  public static fromFullDidDetails(
    api: ApiPromise,
    details: FullDidDetails
  ): FullDidUpdateBuilder {
    const keyAgreementKeys = details.getKeys(
      KeyRelationship.keyAgreement
    ) as DidEncryptionKey[]
    const {
      authenticationKey,
      attestationKey: assertionKey,
      delegationKey,
    } = details
    const serviceEndpoints = details.getEndpoints()

    return new FullDidUpdateBuilder(api, {
      identifier: details.identifier,
      authenticationKey,
      keyAgreementKeys,
      assertionKey,
      delegationKey,
      serviceEndpoints,
    })
  }

  public setAuthenticationKey(
    key: NewDidVerificationKey
  ): FullDidUpdateBuilder {
    if (this.consumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID builder has already been consumed.'
      )
    }
    // 1. Check that no other authentication key has already been set.
    if (this.newAuthenticationKey) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'A new authentication key has already been marked for addition.'
      )
    }

    const extrinsic = this.apiObject.tx.did.setAuthenticationKey(
      formatPublicKey(key)
    )

    // Called before updating the authentication key. Pushed to the first batch.
    this.pushToRightBatch(extrinsic)
    this.newAuthenticationKey = key

    return this
  }

  public addEncryptionKey(key: NewDidEncryptionKey): FullDidUpdateBuilder {
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
    this.pushToRightBatch(extrinsic)

    return this
  }

  public removeEncryptionKey(keyId: DidKey['id']): FullDidUpdateBuilder {
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
    this.pushToRightBatch(extrinsic)

    return this
  }

  public setAttestationKey(key: NewDidVerificationKey): FullDidUpdateBuilder {
    // 1. Check that the attestation key has not already been marked for deletion.
    if (this.newAssertionKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The assertion key has already been marked for deletion.'
      )
    }
    const extrinsic = this.apiObject.tx.did.setAttestationKey(
      formatPublicKey(key)
    )

    super.setAttestationKey(key)
    this.pushToRightBatch(extrinsic)

    return this
  }

  public removeAttestationKey(): FullDidUpdateBuilder {
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
    this.pushToRightBatch(extrinsic)

    return this
  }

  public setDelegationKey(key: NewDidVerificationKey): FullDidUpdateBuilder {
    // 1. Check that the delegation key has not already been marked for deletion.
    if (this.newDelegationKey.action === 'delete') {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'The delegation key has already been marked for deletion.'
      )
    }
    const extrinsic = this.apiObject.tx.did.setDelegationKey(
      formatPublicKey(key)
    )

    super.setDelegationKey(key)
    this.pushToRightBatch(extrinsic)

    return this
  }

  public removeDelegationKey(): FullDidUpdateBuilder {
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
    this.pushToRightBatch(extrinsic)

    return this
  }

  public addServiceEndpoint(service: DidServiceEndpoint): FullDidUpdateBuilder {
    // 1. Check if the service is already present in the DID.
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
    this.pushToRightBatch(extrinsic)

    return this
  }

  public removeServiceEndpoint(
    serviceId: DidServiceEndpoint['id']
  ): FullDidUpdateBuilder {
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
    this.pushToRightBatch(extrinsic)

    return this
  }

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

  public async consume(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    atomic = true
  ): Promise<SubmittableExtrinsic> {
    const first: SubmittableExtrinsic = atomic
      ? this.apiObject.tx.utility.batchAll(this.firstBatch)
      : this.apiObject.tx.utility.batch(this.firstBatch)

    const lastDidNonce = await DidChain.queryNonce(this.identifier)
    const firstBatchAuthenticated = await generateDidAuthenticatedTx({
      didIdentifier: this.identifier,
      signingPublicKey: this.oldAuthenticationKey.publicKey,
      alg: getSignatureAlgForKeyType(this.oldAuthenticationKey.type),
      signer,
      call: first,
      // TODO: Wrap around max value
      txCounter: lastDidNonce.addn(1),
      submitter,
    })

    // Batch of batches
    const finalBatch: SubmittableExtrinsic[] = [firstBatchAuthenticated]

    if (this.newAuthenticationKey) {
      const second: SubmittableExtrinsic = atomic
        ? this.apiObject.tx.utility.batchAll(this.secondBatch)
        : this.apiObject.tx.utility.batch(this.secondBatch)

      const secondBatchAuthenticated = await generateDidAuthenticatedTx({
        didIdentifier: this.identifier,
        signingPublicKey: this.newAuthenticationKey.publicKey,
        alg: getSignatureAlgForKeyType(this.newAuthenticationKey.type),
        signer,
        call: second,
        // TODO: Wrap around max value
        txCounter: lastDidNonce.addn(2),
        submitter,
      })

      finalBatch.push(secondBatchAuthenticated)
    }

    return atomic
      ? this.apiObject.tx.utility.batchAll(finalBatch)
      : this.apiObject.tx.utility.batch(finalBatch)
  }

  private pushToRightBatch(extrinsic: SubmittableExtrinsic): void {
    if (this.newAuthenticationKey) {
      this.secondBatch.push(extrinsic)
    } else {
      this.firstBatch.push(extrinsic)
    }
  }
}

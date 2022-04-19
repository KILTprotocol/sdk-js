/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToHex } from '@polkadot/util'

import {
  DidEncryptionKey,
  DidKey,
  DidPublicKey,
  DidServiceEndpoint,
  DidSignature,
  DidVerificationKey,
  IDidDetails,
  DidIdentifier,
  KeystoreSigner,
  VerificationKeyType,
  KeyRelationship,
  VerificationKeyRelationship,
  EncryptionKeyRelationship,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import type { DidConstructorDetails, MapKeysToRelationship } from '../types.js'
import {
  getSigningAlgorithmForVerificationKeyType,
  isVerificationKey,
  assembleKeyUri,
} from '../Did.utils.js'

import { checkDidCreationDetails } from './DidDetails.utils.js'

type PublicKeysInner = Map<DidKey['id'], Omit<DidKey, 'id'>>
type ServiceEndpointsInner = Map<
  DidServiceEndpoint['id'],
  Omit<DidServiceEndpoint, 'id'>
>

export abstract class DidDetails implements IDidDetails {
  public readonly uri: IDidDetails['uri']

  // { key ID -> key details} - key ID does not include the DID subject
  protected publicKeys: PublicKeysInner

  // { key relationship -> set of key IDs}
  protected keyRelationships: MapKeysToRelationship

  // { service ID -> service details} - service ID does not include the DID subject
  protected serviceEndpoints: ServiceEndpointsInner

  protected constructor({
    uri,
    keys,
    keyRelationships,
    serviceEndpoints = {},
  }: DidConstructorDetails) {
    checkDidCreationDetails({
      uri,
      keys,
      keyRelationships,
      serviceEndpoints,
    })

    this.uri = uri
    this.publicKeys = new Map(Object.entries(keys))
    this.keyRelationships = keyRelationships
    this.serviceEndpoints = new Map(Object.entries(serviceEndpoints))
  }

  public abstract get identifier(): DidIdentifier

  /**
   * Returns the first authentication key of the DID.
   *
   * @returns The first authentication key, in the order they are stored internally, of the given DID.
   */
  public get authenticationKey(): DidVerificationKey {
    const firstAuthenticationKey = this.getVerificationKeys(
      KeyRelationship.authentication
    )[0]
    if (!firstAuthenticationKey) {
      throw SDKErrors.ERROR_DID_ERROR(
        'Unexpected error. Any DID should always have at least one authentication key.'
      )
    }
    return firstAuthenticationKey
  }

  /**
   * Returns the first encryption key of the DID, if any.
   *
   * @returns The first encryption key, in the order they are stored internally, of the given DID.
   */
  public get encryptionKey(): DidEncryptionKey | undefined {
    return this.getEncryptionKeys(KeyRelationship.keyAgreement)[0]
  }

  /**
   * Returns the first attestation key of the DID, if any.
   *
   * @returns The first attestation key, in the order they are stored internally, of the given DID.
   */
  public get attestationKey(): DidVerificationKey | undefined {
    return this.getVerificationKeys(KeyRelationship.assertionMethod)[0]
  }

  /**
   * Returns the first delegation key of the DID, if any.
   *
   * @returns The first delegation key, in the order they are stored internally, of the given DID.
   */
  public get delegationKey(): DidVerificationKey | undefined {
    return this.getVerificationKeys(KeyRelationship.capabilityDelegation)[0]
  }

  public getKey(id: DidKey['id']): DidKey | undefined {
    const keyDetails = this.publicKeys.get(id)
    if (!keyDetails) {
      return undefined
    }
    return {
      id,
      ...keyDetails,
    }
  }

  public getVerificationKeys(
    relationship: VerificationKeyRelationship
  ): DidVerificationKey[] {
    const keyIds = this.keyRelationships[relationship] || []
    return [...keyIds].map((keyId) => this.getKey(keyId) as DidVerificationKey)
  }

  public getEncryptionKeys(
    relationship: EncryptionKeyRelationship
  ): DidEncryptionKey[] {
    const keyIds = this.keyRelationships[relationship] || []
    return [...keyIds].map((keyId) => this.getKey(keyId) as DidEncryptionKey)
  }

  public getKeys(): DidKey[] {
    const keyIds = this.publicKeys.keys()
    return [...keyIds].map((keyId) => this.getKey(keyId) as DidKey)
  }

  public getEndpoint(
    id: DidServiceEndpoint['id']
  ): DidServiceEndpoint | undefined {
    const endpointDetails = this.serviceEndpoints.get(id)
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
      ? [...this.serviceEndpoints.entries()].filter(([, details]) => {
          return details.types.includes(type)
        })
      : [...this.serviceEndpoints.entries()]

    return serviceEndpointsEntries.map(([id, details]) => {
      return { id, ...details }
    })
  }

  /**
   * Compute the full URI (did:kilt:<identifier>#<key_id> for a given DID key <key_id>.
   *
   * @param keyId The key ID, without the leading subject's DID prefix.
   *
   * @returns The full [[DidPublicKey['uri']]], which includes the subject's DID and the provided key ID.
   */
  public assembleKeyUri(keyId: DidKey['id']): DidPublicKey['uri'] {
    return assembleKeyUri(this.uri, keyId)
  }

  /**
   * Generate a signature over the provided input payload, either as a byte array or as a HEX-encoded string.
   *
   * @param payload The byte array or HEX-encoded payload to sign.
   * @param signer The keystore signer to use for the signing operation.
   * @param keyId The key ID to use to generate the signature.
   *
   * @returns The resulting [[DidSignature]].
   */
  public async signPayload(
    payload: Uint8Array | string,
    signer: KeystoreSigner,
    keyId: DidVerificationKey['id']
  ): Promise<DidSignature> {
    const key = this.getKey(keyId)
    if (!key || !isVerificationKey(key)) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Failed to find verification key with ID ${keyId} on DID (${this.uri})`
      )
    }
    const alg = getSigningAlgorithmForVerificationKeyType(
      key.type as VerificationKeyType
    )
    if (!alg) {
      throw SDKErrors.ERROR_DID_ERROR(
        `No algorithm found for key type ${key.type}`
      )
    }
    const { data: signature } = await signer.sign({
      publicKey: key.publicKey,
      alg,
      data: Crypto.coToUInt8(payload),
    })
    return {
      keyUri: this.assembleKeyUri(key.id),
      signature: u8aToHex(signature),
    }
  }
}

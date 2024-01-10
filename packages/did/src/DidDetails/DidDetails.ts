/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  Service,
  UriFragment,
  VerificationMethod,
  VerificationRelationship,
} from '@kiltprotocol/types'

import { didKeyToVerificationMethod } from '../Did.utils.js'

/**
 * Possible types for a DID verification method used in digital signatures.
 */
const signingMethodTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const
export const signingMethodTypes = signingMethodTypesC as unknown as string[]
export type DidSigningMethodType = typeof signingMethodTypesC[number]
// `as unknown as string[]` is a workaround for https://github.com/microsoft/TypeScript/issues/26255

/**
 * Type guard checking whether the provided input string represents one of the supported signing verification types.
 *
 * @param input The input string.
 * @returns Whether the input string is an instance of {@link DidSigningMethodType}.
 */
export function isValidVerificationMethodType(
  input: string
): input is DidSigningMethodType {
  return signingMethodTypes.includes(input)
}

/**
 * Possible types for a DID verification method used in encryption.
 */
const encryptionMethodTypesC = ['x25519'] as const
export const encryptionMethodTypes =
  encryptionMethodTypesC as unknown as string[]
export type DidEncryptionMethodType = typeof encryptionMethodTypesC[number]

/**
 * Type guard checking whether the provided input string represents one of the supported encryption verification types.
 *
 * @param input The input string.
 * @returns Whether the input string is an instance of {@link DidEncryptionMethodType}.
 */
export function isValidEncryptionMethodType(
  input: string
): input is DidEncryptionMethodType {
  return encryptionMethodTypes.includes(input)
}

export type DidVerificationMethodType =
  | DidSigningMethodType
  | DidEncryptionMethodType

/**
 * Type guard checking whether the provided input string represents one of the supported signing or encryption verification types.
 *
 * @param input The input string.
 * @returns Whether the input string is an instance of {@link DidSigningMethodType}.
 */
export function isValidDidVerificationType(
  input: string
): input is DidSigningMethodType {
  return (
    isValidVerificationMethodType(input) || isValidEncryptionMethodType(input)
  )
}

export type NewVerificationMethod = Omit<VerificationMethod, 'controller'>
export type NewService = Service

/**
 * Type guard checking whether the provided input represents one of the supported verification relationships.
 *
 * @param input The input.
 * @returns Whether the input is an instance of {@link VerificationRelationship}.
 */
export function isValidVerificationRelationship(
  input: unknown
): input is VerificationRelationship {
  switch (input as VerificationRelationship) {
    case 'assertionMethod':
    case 'authentication':
    case 'capabilityDelegation':
    case 'keyAgreement':
      return true
    default:
      return false
  }
}

/**
 * Type of a new key material to add under a DID.
 */
export type BaseNewDidKey = {
  publicKey: Uint8Array
  type: string
}

/**
 * Type of a new verification key to add under a DID.
 */
export type NewDidVerificationKey = BaseNewDidKey & {
  type: DidSigningMethodType
}

/**
 * Type of a new encryption key to add under a DID.
 */
export type NewDidEncryptionKey = BaseNewDidKey & {
  type: DidEncryptionMethodType
}

function doesVerificationMethodExist(
  didDocument: DidDocument,
  { id }: Pick<VerificationMethod, 'id'>
): boolean {
  return (
    didDocument.verificationMethod?.find((vm) => vm.id === id) !== undefined
  )
}

function addVerificationMethod(
  didDocument: DidDocument,
  verificationMethod: VerificationMethod,
  relationship: VerificationRelationship
): void {
  const existingRelationship = didDocument[relationship] ?? []
  existingRelationship.push(verificationMethod.id)
  // eslint-disable-next-line no-param-reassign
  didDocument[relationship] = existingRelationship
  if (!doesVerificationMethodExist(didDocument, verificationMethod)) {
    const existingVerificationMethod = didDocument.verificationMethod ?? []
    existingVerificationMethod.push(verificationMethod)
    // eslint-disable-next-line no-param-reassign
    didDocument.verificationMethod = existingVerificationMethod
  }
}

/**
 * Add the provided keypair as a new verification method to the DID Document.
 * !!! This function is meant to be used internally and not exposed since it is mostly used as a utility and does not perform extensive checks on the inputs.
 *
 * @param didDocument The DID Document to add the verification method to.
 * @param newKeypair The new keypair to add as a verification method.
 * @param newKeypair.id The ID of the new verification method. If a verification method with the same ID already exists, this operation is a no-op.
 * @param newKeypair.publicKey The public key of the keypair.
 * @param newKeypair.type The type of the public key.
 * @param relationship The verification relationship to add the verification method to.
 */
export function addKeypairAsVerificationMethod(
  didDocument: DidDocument,
  { id, publicKey, type: keyType }: BaseNewDidKey & { id: UriFragment },
  relationship: VerificationRelationship
): void {
  const verificationMethod = didKeyToVerificationMethod(didDocument.id, id, {
    keyType: keyType as DidSigningMethodType,
    publicKey,
  })
  addVerificationMethod(didDocument, verificationMethod, relationship)
}

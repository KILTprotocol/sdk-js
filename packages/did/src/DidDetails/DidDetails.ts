/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
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
 * Possible types for a DID verification key.
 */
const verificationKeyTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const
export const verificationKeyTypes = verificationKeyTypesC as unknown as string[]
export type DidVerificationKeyType = typeof verificationKeyTypesC[number]
// `as unknown as string[]` is a workaround for https://github.com/microsoft/TypeScript/issues/26255

export function isValidVerificationKeyType(
  input: string
): input is DidVerificationKeyType {
  return verificationKeyTypes.includes(input)
}

/**
 * Possible types for a DID encryption key.
 */
const encryptionKeyTypesC = ['x25519'] as const
export const encryptionKeyTypes = encryptionKeyTypesC as unknown as string[]
export type DidEncryptionKeyType = typeof encryptionKeyTypesC[number]

export function isValidEncryptionKeyType(
  input: string
): input is DidEncryptionKeyType {
  return encryptionKeyTypes.includes(input)
}

export type DidKeyType = DidVerificationKeyType | DidEncryptionKeyType

export function isValidDidKeyType(input: string): input is DidKeyType {
  return isValidVerificationKeyType(input) || isValidEncryptionKeyType(input)
}

export type NewVerificationMethod = Omit<VerificationMethod, 'controller'>
export type NewService = Service

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
  type: DidVerificationKeyType
}

/**
 * Type of a new encryption key to add under a DID.
 */
export type NewDidEncryptionKey = BaseNewDidKey & {
  type: DidEncryptionKeyType
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
    keyType: keyType as DidKeyType,
    publicKey,
  })
  addVerificationMethod(didDocument, verificationMethod, relationship)
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToHex, isHex } from '@polkadot/util'

import {
  DidSignature,
  DidVerificationKey,
  IDidDetails,
  IDidResolver,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { DidResolver } from './DidResolver/index.js'
import { parseDidUri, validateKiltDidUri } from './Did.utils.js'

type DidSignatureVerificationFromDetailsInput = {
  message: string | Uint8Array
  signature: string
  keyId: DidVerificationKey['id']
  expectedVerificationMethod?: VerificationKeyRelationship
  details: IDidDetails
}

export type VerificationResult = {
  verified: boolean
  reason?: string
  didDetails?: IDidDetails
  key?: DidVerificationKey
}

function verifyDidSignatureFromDetails({
  message,
  signature,
  keyId,
  expectedVerificationMethod,
  details,
}: DidSignatureVerificationFromDetailsInput): VerificationResult {
  const key = details.getKey(keyId)
  if (!key) {
    return {
      verified: false,
      reason: `No key with ID ${keyId} for the DID ${details.uri}`,
    }
  }
  // Check whether the provided key ID is within the keys for a given verification relationship, if provided.
  if (
    expectedVerificationMethod &&
    !details
      .getVerificationKeys(expectedVerificationMethod)
      .map((verKey) => verKey.id)
      .includes(keyId)
  ) {
    return {
      verified: false,
      reason: `No key with ID ${keyId} for the verification method ${expectedVerificationMethod}`,
    }
  }
  const isSignatureValid = Crypto.verify(
    message,
    signature,
    u8aToHex(key.publicKey)
  )
  if (!isSignatureValid) {
    return {
      verified: false,
      reason: 'Invalid signature',
    }
  }
  return {
    verified: true,
    didDetails: details,
    key: key as DidVerificationKey,
  }
}

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: DidSignature
  expectedVerificationMethod?: VerificationKeyRelationship
  resolver?: IDidResolver
}

/**
 * Verify a DID signature given the key URI of the signature.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature An object containing signature and signer key.
 * @param input.expectedVerificationMethod Which relationship to the signer DID the key must have.
 * @param input.resolver Allows specifying a custom DID resolver. Defaults to the built-in [[DidResolver]].
 * @returns Object indicating verification result and optionally reason for failure.
 */
export async function verifyDidSignature({
  message,
  signature,
  expectedVerificationMethod,
  resolver = DidResolver,
}: DidSignatureVerificationInput): Promise<VerificationResult> {
  let keyId: string
  try {
    // Verification fails if the signature key ID is not valid
    const { fragment } = parseDidUri(signature.keyUri)
    if (!fragment) throw new Error()
    keyId = fragment
  } catch {
    return {
      verified: false,
      reason: `Signature key ID ${signature.keyUri} invalid.`,
    }
  }
  const resolutionDetails = await resolver.resolveDoc(signature.keyUri)
  // Verification fails if the DID does not exist at all.
  if (!resolutionDetails) {
    return {
      verified: false,
      reason: `No result for provided key ID ${signature.keyUri}`,
    }
  }
  // Verification also fails if the DID has been deleted.
  if (resolutionDetails.metadata.deactivated) {
    return {
      verified: false,
      reason: 'DID for provided key is deactivated.',
    }
  }
  // Verification also fails if the signer is a migrated light DID.
  if (resolutionDetails.metadata.canonicalId) {
    return {
      verified: false,
      reason: 'DID for provided key has been migrated and not usable anymore.',
    }
  }
  // Otherwise, the details used are either the migrated full DID details or the light DID details.
  const details = (
    resolutionDetails.metadata.canonicalId
      ? (await resolver.resolveDoc(resolutionDetails.metadata.canonicalId))
          ?.details
      : resolutionDetails.details
  ) as IDidDetails

  return verifyDidSignatureFromDetails({
    message,
    signature: signature.signature,
    keyId,
    expectedVerificationMethod,
    details,
  })
}

/**
 * Type guard assuring that a the input is a valid DidSignature object, consisting of a signature as hex and the uri of the signing key.
 * Does not cryptographically verify the signature itself!
 *
 * @param input Arbitrary input.
 * @returns True if validation of form has passed.
 * @throws [[SDKError]] if validation fails.
 */
export function isDidSignature(input: unknown): input is DidSignature {
  const signature = input as DidSignature
  try {
    if (
      !isHex(signature.signature) ||
      !validateKiltDidUri(signature.keyUri, true)
    ) {
      throw new SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
    }
    return true
  } catch (e) {
    // TODO: type guards shouldn't throw
    throw new SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
  }
}

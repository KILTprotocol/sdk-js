/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToHex, isHex } from '@polkadot/util'

import {
  DidDocument,
  DidResolve,
  DidResourceUri,
  DidSignature,
  DidVerificationKey,
  UriFragment,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { resolve } from './DidResolver/index.js'
import { parseDidUri, validateKiltDidUri } from './Did.utils.js'
import * as Did from './index.js'

type DidSignatureVerificationFromDetailsInput = {
  message: string | Uint8Array
  signature: string
  keyId: DidVerificationKey['id']
  expectedVerificationMethod?: VerificationKeyRelationship
  did: DidDocument
}

export type VerificationResult = {
  verified: boolean
  reason?: string
  did?: DidDocument
  key?: DidVerificationKey
}

function verifyDidSignatureFromDetails({
  message,
  signature,
  keyId,
  expectedVerificationMethod,
  did,
}: DidSignatureVerificationFromDetailsInput): VerificationResult {
  const key = Did.getKey(did, keyId)
  if (!key) {
    return {
      verified: false,
      reason: `No key with ID "${keyId}" for the DID ${did.uri}`,
    }
  }
  // Check whether the provided key ID is within the keys for a given verification relationship, if provided.
  if (
    expectedVerificationMethod &&
    !did[expectedVerificationMethod]?.map((verKey) => verKey.id).includes(keyId)
  ) {
    return {
      verified: false,
      reason: `No key with ID "${keyId}" for the verification method "${expectedVerificationMethod}"`,
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
    did,
    key: key as DidVerificationKey,
  }
}

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: DidSignature
  expectedVerificationMethod?: VerificationKeyRelationship
  didResolve?: DidResolve
}

/**
 * Verify a DID signature given the key URI of the signature.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature An object containing signature and signer key.
 * @param input.expectedVerificationMethod Which relationship to the signer DID the key must have.
 * @param input.didResolve Allows specifying a custom DID resolve. Defaults to the built-in [[resolve]].
 * @returns Object indicating verification result and optionally reason for failure.
 */
export async function verifyDidSignature({
  message,
  signature,
  expectedVerificationMethod,
  didResolve = resolve,
}: DidSignatureVerificationInput): Promise<VerificationResult> {
  let keyId: UriFragment
  let keyUri: DidResourceUri
  try {
    // Add support for old signatures that had the `keyId` instead of the `keyUri`
    const inputUri = signature.keyUri || (signature as any).keyId
    // Verification fails if the signature key URI is not valid
    const { fragment } = parseDidUri(inputUri)
    if (!fragment) throw new Error()

    keyId = fragment
    keyUri = inputUri
  } catch {
    return {
      verified: false,
      reason: `Signature key URI "${signature.keyUri}" invalid`,
    }
  }
  const resolutionDetails = await didResolve(keyUri)
  // Verification fails if the DID does not exist at all.
  if (!resolutionDetails) {
    return {
      verified: false,
      reason: `No result for provided key URI "${keyUri}"`,
    }
  }
  // Verification also fails if the DID has been deleted.
  if (resolutionDetails.metadata.deactivated) {
    return {
      verified: false,
      reason: 'DID for provided key is deactivated',
    }
  }
  // Verification also fails if the signer is a migrated light DID.
  if (resolutionDetails.metadata.canonicalId) {
    return {
      verified: false,
      reason: 'DID for provided key has been migrated and not usable anymore',
    }
  }
  // Otherwise, the document used is either the migrated full DID document or the light DID document.
  const did = (
    resolutionDetails.metadata.canonicalId
      ? (await didResolve(resolutionDetails.metadata.canonicalId))?.document
      : resolutionDetails.document
  ) as DidDocument

  return verifyDidSignatureFromDetails({
    message,
    signature: signature.signature,
    keyId,
    expectedVerificationMethod,
    did,
  })
}

// Used solely for retro-compatibility with previously-generated DID signatures.
// It is reasonable to think that it will be removed at some point in the future.
type OldDidSignature = Pick<DidSignature, 'signature'> & {
  keyId: DidSignature['keyUri']
}

/**
 * Type guard assuring that the input is a valid DidSignature object, consisting of a signature as hex and the uri of the signing key.
 * Does not cryptographically verify the signature itself!
 *
 * @param input Arbitrary input.
 * @returns True if validation of form has passed.
 */
export function isDidSignature(
  input: unknown
): input is DidSignature | OldDidSignature {
  const signature = input as DidSignature | OldDidSignature
  try {
    if (
      !isHex(signature.signature) ||
      !validateKiltDidUri(
        (signature as any).keyUri || (signature as any).keyId,
        true
      )
    ) {
      throw new SDKErrors.SignatureMalformedError()
    }
    return true
  } catch (cause) {
    // TODO: type guards shouldn't throw
    throw new SDKErrors.SignatureMalformedError(undefined, {
      cause: cause as Error,
    })
  }
}

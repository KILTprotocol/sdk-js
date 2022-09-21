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
  UriFragment,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { resolve } from './DidResolver/index.js'
import { parse, validateKiltDidUri } from './Did.utils.js'
import * as Did from './index.js'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: DidSignature
  expectedVerificationMethod?: VerificationKeyRelationship
  didResolve?: DidResolve
}

// Used solely for retro-compatibility with previously-generated DID signatures.
// It is reasonable to think that it will be removed at some point in the future.
type OldDidSignature = Pick<DidSignature, 'signature'> & {
  keyId: DidSignature['keyUri']
}

/**
 * Checks whether the input is a valid DidSignature object, consisting of a signature as hex and the uri of the signing key.
 * Does not cryptographically verify the signature itself!
 *
 * @param input Arbitrary input.
 */
export function verifyDidSignatureDataStructure(
  input: DidSignature | OldDidSignature
): void {
  const keyUri = 'keyUri' in input ? input.keyUri : input.keyId
  if (!isHex(input.signature)) {
    throw new SDKErrors.SignatureMalformedError(
      `Expected signature as a hex string, got ${input.signature}`
    )
  }
  validateKiltDidUri(keyUri, 'ResourceUri')
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
 */
export async function verifyDidSignature({
  message,
  signature,
  expectedVerificationMethod,
  didResolve = resolve,
}: DidSignatureVerificationInput): Promise<void> {
  verifyDidSignatureDataStructure(signature)
  // Add support for old signatures that had the `keyId` instead of the `keyUri`
  const inputUri = signature.keyUri || (signature as any).keyId
  // Verification fails if the signature key URI is not valid
  const { fragment } = parse(inputUri)
  if (!fragment)
    throw new SDKErrors.SignatureMalformedError(
      `Signature key URI "${signature.keyUri}" invalid`
    )

  const keyId: UriFragment = fragment
  const keyUri: DidResourceUri = inputUri

  const resolutionDetails = await didResolve(keyUri)
  // Verification fails if the DID does not exist at all.
  if (!resolutionDetails) {
    throw new SDKErrors.DidError(`No result for provided key URI "${keyUri}"`)
  }

  // Verification also fails if the DID has been deleted.
  if (resolutionDetails.metadata.deactivated) {
    throw new SDKErrors.DidError('DID for provided key is deactivated')
  }
  // Verification also fails if the signer is a migrated light DID.
  if (resolutionDetails.metadata.canonicalId) {
    throw new SDKErrors.DidError(
      'DID for provided key has been migrated and not usable anymore'
    )
  }

  // Otherwise, the document used is either the migrated full DID document or the light DID document.
  const did = (
    resolutionDetails.metadata.canonicalId !== undefined
      ? (await didResolve(resolutionDetails.metadata.canonicalId))?.document
      : resolutionDetails.document
  ) as DidDocument

  const key = Did.getKey(did, keyId)
  if (!key) {
    throw new SDKErrors.DidError(
      `No key with ID "${keyId}" for the DID ${did.uri}`
    )
  }
  // Check whether the provided key ID is within the keys for a given verification relationship, if provided.
  if (
    expectedVerificationMethod &&
    !did[expectedVerificationMethod]?.map((verKey) => verKey.id).includes(keyId)
  ) {
    throw new SDKErrors.DidError(
      `No key with ID "${keyId}" for the verification method "${expectedVerificationMethod}"`
    )
  }
  Crypto.verify(message, signature.signature, u8aToHex(key.publicKey))
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
  try {
    verifyDidSignatureDataStructure(input as DidSignature)
    return true
  } catch (cause) {
    return false
  }
}

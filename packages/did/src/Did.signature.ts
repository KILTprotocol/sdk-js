/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { isHex } from '@polkadot/util'

import {
  DidResolveKey,
  DidResourceUri,
  DidSignature,
  SignResponseData,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { resolveKey } from './DidResolver/index.js'
import { parse, validateUri } from './Did.utils.js'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  keyUri: DidResourceUri
  expectedVerificationMethod?: VerificationKeyRelationship
  didResolveKey?: DidResolveKey
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
function verifyDidSignatureDataStructure(
  input: DidSignature | OldDidSignature
): void {
  const keyUri = 'keyUri' in input ? input.keyUri : input.keyId
  if (!isHex(input.signature)) {
    throw new SDKErrors.SignatureMalformedError(
      `Expected signature as a hex string, got ${input.signature}`
    )
  }
  validateUri(keyUri, 'ResourceUri')
}

/**
 * Verify a DID signature given the key URI of the signature.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature Signature bytes.
 * @param input.keyUri DID URI of the key used for signing.
 * @param input.expectedVerificationMethod Which relationship to the signer DID the key must have.
 * @param input.didResolveKey Allows specifying a custom DID key resolve. Defaults to the built-in [[resolveKey]].
 */
export async function verifyDidSignature({
  message,
  signature,
  keyUri,
  expectedVerificationMethod,
  didResolveKey = resolveKey,
}: DidSignatureVerificationInput): Promise<void> {
  // Verification fails if the signature key URI is not valid
  const { fragment } = parse(keyUri)
  if (!fragment)
    throw new SDKErrors.SignatureMalformedError(
      `Signature key URI "${keyUri}" invalid`
    )

  const { publicKey } = await didResolveKey(keyUri, expectedVerificationMethod)

  Crypto.verify(message, signature, publicKey)
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

/**
 * Transforms the output of a [[SignCallback]] into the [[DidSignature]] format suitable for json-based data exchange.
 *
 * @param input Signature data returned from the [[SignCallback]].
 * @param input.signature Signature bytes.
 * @param input.keyUri DID URI of the key used for signing.
 * @returns A [[DidSignature]] object where signature is hex-encoded.
 */
export function signatureToJson({
  signature,
  keyUri,
}: SignResponseData): DidSignature {
  return { signature: Crypto.u8aToHex(signature), keyUri }
}

/**
 * Deserializes a [[DidSignature]] for signature verification.
 * Handles backwards compatibility to an older version of the interface where the `keyUri` property was called `keyId`.
 *
 * @param input A [[DidSignature]] object.
 * @returns The deserialized DidSignature where the signature is represented as a Uint8Array.
 */
export function signatureFromJson(
  input: DidSignature | OldDidSignature
): Pick<SignResponseData, 'keyUri' | 'signature'> {
  const keyUri = 'keyUri' in input ? input.keyUri : input.keyId
  const signature = Crypto.coToUInt8(input.signature)
  return { signature, keyUri }
}

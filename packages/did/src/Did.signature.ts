/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { isHex, u8aToU8a } from '@polkadot/util'
import { signatureVerify } from '@polkadot/util-crypto'

import {
  DidResolveKey,
  DidResourceUri,
  DidSignature,
  DidUri,
  SignResponseData,
  VerificationKeyRelationship,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { resolveKey } from './DidResolver/index.js'
import { parse, validateUri } from './Did.utils.js'

export type VerifierFunction = (
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
) => boolean
export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  keyUri: DidResourceUri
  expectedSigner?: DidUri
  allowUpgraded?: boolean
  expectedVerificationMethod?: VerificationKeyRelationship
  didResolveKey?: DidResolveKey
  verifiers?: Record<VerificationKeyType, VerifierFunction>
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

const polkadotVerify: VerifierFunction = (message, signature, publicKey) =>
  signatureVerify(message, signature, publicKey).isValid
const polkadotVerifiers: Record<VerificationKeyType, VerifierFunction> = {
  ecdsa: polkadotVerify,
  ed25519: polkadotVerify,
  sr25519: polkadotVerify,
}

/**
 * Verify a DID signature given the key URI of the signature.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature Signature bytes.
 * @param input.keyUri DID URI of the key used for signing.
 * @param input.expectedSigner If given, verification fails if the controller of the signing key is not the expectedSigner.
 * @param input.allowUpgraded If `expectedSigner` is a light DID, setting this flag to `true` will accept signatures by the corresponding full DID.
 * @param input.expectedVerificationMethod Which relationship to the signer DID the key must have.
 * @param input.didResolveKey Allows specifying a custom DID key resolve. Defaults to the built-in [[resolveKey]].
 * @param input.verifiers An object mapping key types to a verification function. Defaults to using polkadot-js's `signatureVerify` for all known key types.
 */
export async function verifyDidSignature({
  message,
  signature,
  keyUri,
  expectedSigner,
  allowUpgraded = false,
  expectedVerificationMethod,
  didResolveKey = resolveKey,
  verifiers = polkadotVerifiers,
}: DidSignatureVerificationInput): Promise<void> {
  // checks if key uri points to the right did; alternatively we could check the key's controller
  const signer = parse(keyUri)
  if (expectedSigner && expectedSigner !== signer.did) {
    // check for allowable exceptions
    const expected = parse(expectedSigner)
    // NECESSARY CONDITION: subjects and versions match
    const subjectVersionMatch =
      expected.address === signer.address && expected.version === signer.version
    // EITHER: signer is a full did and we allow signatures by corresponding full did
    const allowedUpgrade = allowUpgraded && signer.type === 'full'
    // OR: both are light dids and their auth key type matches
    const keyTypeMatch =
      signer.type === 'light' &&
      expected.type === 'light' &&
      expected.authKeyTypeEncoding === signer.authKeyTypeEncoding
    if (!(subjectVersionMatch && (allowedUpgrade || keyTypeMatch))) {
      throw new SDKErrors.DidSubjectMismatchError(signer.did, expected.did)
    }
  }

  const { publicKey, type } = await didResolveKey(
    keyUri,
    expectedVerificationMethod
  )
  if (!Object.hasOwn(verifiers, type))
    throw new Error(
      `no signature verification function available for key type ${type}`
    )
  if (verifiers[type](u8aToU8a(message), signature, publicKey) !== true)
    throw new SDKErrors.SignatureUnverifiableError()
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

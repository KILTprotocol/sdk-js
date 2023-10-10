/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DereferenceDidUrl,
  DidUri,
  DidUrl,
  SignatureVerificationMethodRelationship,
  SignResponseData,
  VerificationMethod,
} from '@kiltprotocol/types'

import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'

import { multibaseKeyToDidKey, parse, validateUri } from './Did.utils.js'
import { dereference } from './DidResolver/DidResolver.js'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  signerUrl: DidUrl
  expectedSigner?: DidUri
  allowUpgraded?: boolean
  expectedVerificationMethodRelationship?: SignatureVerificationMethodRelationship
  dereferenceDidUrl?: DereferenceDidUrl<string>['dereference']
}

export type DidSignature = {
  signerUrl: DidUrl
  signature: string
}

// Used solely for retro-compatibility with previously-generated DID signatures.
// It is reasonable to think that it will be removed at some point in the future.
type OldDidSignatureV1 = {
  signature: string
  keyId: DidUrl
}
type OldDidSignatureV2 = {
  signature: string
  keyUri: DidUrl
}

function verifyDidSignatureDataStructure(
  input: DidSignature | OldDidSignatureV1 | OldDidSignatureV2
): void {
  const verificationMethodUri = (() => {
    if ('keyUri' in input) {
      return input.keyUri
    }
    if ('keyId' in input) {
      return input.keyId
    }
    return input.signerUrl
  })()
  if (!isHex(input.signature)) {
    throw new SDKErrors.SignatureMalformedError(
      `Expected signature as a hex string, got ${input.signature}`
    )
  }
  validateUri(verificationMethodUri, 'ResourceUri')
}

/**
 * Verify a DID signature given the signer's DID URL.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature Signature bytes.
 * @param input.signerUrl DID URL of the verification method used for signing.
 * @param input.expectedSigner If given, verification fails if the controller of the signing key is not the expectedSigner.
 * @param input.allowUpgraded If `expectedSigner` is a light DID, setting this flag to `true` will accept signatures by the corresponding full DID.
 * @param input.expectedVerificationMethodRelationship Which relationship to the signer DID the verification method must have.
 * @param input.dereferenceDidUrl Allows specifying a custom DID dereference. Defaults to the built-in [[dereferenceDidUrl]].
 */
export async function verifyDidSignature({
  message,
  signature,
  signerUrl,
  expectedSigner,
  allowUpgraded = false,
  expectedVerificationMethodRelationship,
  dereferenceDidUrl = dereference as DereferenceDidUrl<string>['dereference'],
}: DidSignatureVerificationInput): Promise<void> {
  // checks if key uri points to the right did; alternatively we could check the key's controller
  const signer = parse(signerUrl)
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

  const { contentStream, contentMetadata } = await dereferenceDidUrl(
    signerUrl,
    {}
  )
  if (contentStream === undefined) {
    throw new SDKErrors.SignatureUnverifiableError(
      `Error validating the DID signature. Cannot fetch DID Document or the verification method for "${signerUrl}".`
    )
  }
  if (
    expectedVerificationMethodRelationship !== undefined &&
    !contentMetadata?.verificationRelationship?.includes(
      expectedVerificationMethodRelationship
    )
  ) {
    throw new SDKErrors.SignatureUnverifiableError(
      `Cannot find verification "${signerUrl} for the relationship "${expectedVerificationMethodRelationship}".`
    )
  }
  const verificationMethod = contentStream as VerificationMethod

  const { publicKey } = multibaseKeyToDidKey(
    verificationMethod.publicKeyMultibase
  )
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
): input is DidSignature | OldDidSignatureV1 | OldDidSignatureV2 {
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
 * @param input.did The DID URI of the signer.
 * @param input.verificationMethod The verification method used to generate the signature.
 * @returns A [[DidSignature]] object where signature is hex-encoded.
 */
export function signatureToJson({
  did,
  signature,
  verificationMethod,
}: SignResponseData & {
  did: DidUri
}): DidSignature {
  return {
    signature: Crypto.u8aToHex(signature),
    signerUrl: `${did}${verificationMethod.id}`,
  }
}

/**
 * Deserializes a [[DidSignature]] for signature verification.
 * Handles backwards compatibility to an older version of the interface where the `verificationMethodUri` property was called either `keyUri` or `keyId`.
 *
 * @param input A [[DidSignature]] object.
 * @returns The deserialized DidSignature where the signature is represented as a Uint8Array.
 */
export function signatureFromJson(
  input: DidSignature | OldDidSignatureV1 | OldDidSignatureV2
): Pick<SignResponseData, 'signature'> & {
  verificationMethodUri: DidUrl
} {
  const verificationMethodUri = (() => {
    if ('keyUri' in input) {
      return input.keyUri
    }
    if ('keyId' in input) {
      return input.keyId
    }
    return input.signerUrl
  })()
  const signature = Crypto.coToUInt8(input.signature)
  return { signature, verificationMethodUri }
}

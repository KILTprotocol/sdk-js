/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { isHex } from '@polkadot/util'

import type {
  DereferenceDidUrl,
  DidDocument,
  DidSignature,
  Did,
  DidUrl,
  SignatureVerificationRelationship,
  SignResponseData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SignCallback,
} from '@kiltprotocol/types'

import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { multibaseKeyToDidKey, parse, validateDid } from './Did.utils.js'
import { dereference } from './DidResolver/DidResolver.js'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  signerUrl: DidUrl
  expectedSigner?: Did
  allowUpgraded?: boolean
  expectedVerificationRelationship?: SignatureVerificationRelationship
  dereferenceDidUrl?: DereferenceDidUrl['dereference']
}

// Used solely for retro-compatibility with previously-generated DID signatures.
// It is reasonable to think that it will be removed at some point in the future.
type LegacyDidSignature = {
  signature: string
  keyId: DidUrl
}

function verifyDidSignatureDataStructure(
  input: DidSignature | LegacyDidSignature
): void {
  const verificationMethodUrl = (() => {
    if ('keyId' in input) {
      return input.keyId
    }
    return input.keyUri
  })()
  if (!isHex(input.signature)) {
    throw new SDKErrors.SignatureMalformedError(
      `Expected signature as a hex string, got ${input.signature}`
    )
  }
  validateDid(verificationMethodUrl, 'DidUrl')
}

/**
 * Verify a DID signature given the signer's DID URL (i.e., DID + verification method ID).
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature Signature bytes.
 * @param input.signerUrl DID URL of the verification method used for signing.
 * @param input.expectedSigner If given, verification fails if the controller of the signing verification method is not the expectedSigner.
 * @param input.allowUpgraded If `expectedSigner` is a light DID, setting this flag to `true` will accept signatures by the corresponding full DID.
 * @param input.expectedVerificationRelationship Which relationship to the signer DID the verification method must have.
 * @param input.dereferenceDidUrl Allows specifying a custom DID dereferenced. Defaults to the built-in {@link dereference}.
 */
export async function verifyDidSignature({
  message,
  signature,
  signerUrl,
  expectedSigner,
  allowUpgraded = false,
  expectedVerificationRelationship,
  dereferenceDidUrl = dereference as DereferenceDidUrl['dereference'],
}: DidSignatureVerificationInput): Promise<void> {
  // checks if signer URL points to the right did; alternatively we could check the verification method's controller
  const signer = parse(signerUrl)
  if (expectedSigner && expectedSigner !== signer.did) {
    // check for allowable exceptions
    const expected = parse(expectedSigner)
    // NECESSARY CONDITION: subjects and versions match
    const subjectVersionMatch =
      expected.address === signer.address && expected.version === signer.version
    // EITHER: signer is a full did and we allow signatures by corresponding full did
    const allowedUpgrade = allowUpgraded && signer.type === 'full'
    // OR: both are light dids and their auth verification method key type matches
    const keyTypeMatch =
      signer.type === 'light' &&
      expected.type === 'light' &&
      expected.authKeyTypeEncoding === signer.authKeyTypeEncoding
    if (!(subjectVersionMatch && (allowedUpgrade || keyTypeMatch))) {
      throw new SDKErrors.DidSubjectMismatchError(signer.did, expected.did)
    }
  }
  if (signer.fragment === undefined) {
    throw new SDKErrors.DidError(
      `Signer DID URL "${signerUrl}" does not point to a valid resource under the signer's DID Document.`
    )
  }

  const { contentStream, contentMetadata } = await dereferenceDidUrl(
    signer.did,
    {}
  )
  if (contentStream === undefined) {
    throw new SDKErrors.SignatureUnverifiableError(
      `Error validating the DID signature. Cannot fetch DID Document or the verification method for "${signerUrl}".`
    )
  }
  // If the light DID has been upgraded we consider the old key ID invalid, the full DID should be used instead.
  if (contentMetadata.canonicalId !== undefined) {
    throw new SDKErrors.DidResolveUpgradedDidError()
  }
  if (contentMetadata.deactivated) {
    throw new SDKErrors.DidDeactivatedError()
  }
  const didDocument = contentStream as DidDocument
  const verificationMethod = didDocument.verificationMethod?.find(
    ({ controller, id }) =>
      controller === didDocument.id && id === signer.fragment
  )
  if (verificationMethod === undefined) {
    throw new SDKErrors.DidNotFoundError('Verification method not found in DID')
  }
  // Check whether the provided verification method ID is included in the given verification relationship, if provided.
  if (
    expectedVerificationRelationship &&
    !didDocument[expectedVerificationRelationship]?.some(
      (id) => id === verificationMethod.id
    )
  ) {
    throw new SDKErrors.DidError(
      `No verification method "${signer.fragment}" for the verification method "${expectedVerificationRelationship}"`
    )
  }

  const { publicKey } = multibaseKeyToDidKey(
    verificationMethod.publicKeyMultibase
  )
  Crypto.verify(message, signature, publicKey)
}

/**
 * Type guard assuring that the input is a valid DidSignature object, consisting of a signature as hex and the DID URL of the signer's verification method.
 * Does not cryptographically verify the signature itself!
 *
 * @param input Arbitrary input.
 * @returns True if validation of form has passed.
 */
export function isDidSignature(
  input: unknown
): input is DidSignature | LegacyDidSignature {
  try {
    verifyDidSignatureDataStructure(input as DidSignature)
    return true
  } catch (cause) {
    return false
  }
}

/**
 * Transforms the output of a {@link SignCallback} into the {@link DidSignature} format suitable for json-based data exchange.
 *
 * @param input Signature data returned from the {@link SignCallback}.
 * @param input.signature Signature bytes.
 * @param input.verificationMethod The verification method used to generate the signature.
 * @returns A {@link DidSignature} object where signature is hex-encoded.
 */
export function signatureToJson({
  signature,
  verificationMethod,
}: SignResponseData): DidSignature {
  return {
    signature: Crypto.u8aToHex(signature),
    keyUri: `${verificationMethod.controller}${verificationMethod.id}`,
  }
}

/**
 * Deserializes a {@link DidSignature} for signature verification.
 * Handles backwards compatibility to an older version of the interface where the `keyUri` property was called `keyId`.
 *
 * @param input A {@link DidSignature} object.
 * @returns The deserialized DidSignature where the signature is represented as a Uint8Array.
 */
export function signatureFromJson(
  input: DidSignature | LegacyDidSignature
): Pick<SignResponseData, 'signature'> & {
  keyUri: DidUrl
} {
  const keyUri = (() => {
    if ('keyId' in input) {
      return input.keyId
    }
    return input.keyUri
  })()
  const signature = Crypto.coToUInt8(input.signature)
  return { signature, keyUri }
}

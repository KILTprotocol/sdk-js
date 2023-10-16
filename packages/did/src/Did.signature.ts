/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DereferenceDidUrl,
  DidDocument,
  DidUri,
  DidUrl,
  SignatureVerificationRelationship,
  SignResponseData,
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
  expectedVerificationMethodRelationship?: SignatureVerificationRelationship
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
  validateUri(verificationMethodUri, 'Url')
}

/**
 * Verify a DID signature given the signer's DID URL.
 * A signature verification returns false if a migrated and then deleted DID is used.
 *
 * @param input Object wrapping all input.
 * @param input.message The message that was signed.
 * @param input.signature Signature bytes.
 * @param input.signerUrl DID URL of the verification method used for signing.
 * @param input.expectedSigner If given, verification fails if the controller of the signing verification method is not the expectedSigner.
 * @param input.allowUpgraded If `expectedSigner` is a light DID, setting this flag to `true` will accept signatures by the corresponding full DID.
 * @param input.expectedVerificationMethodRelationship Which relationship to the signer DID the verification method must have.
 * @param input.dereferenceDidUrl Allows specifying a custom DID dereferenced. Defaults to the built-in [[dereference]].
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
      `Signer DID URL "${signerUrl}" is not a valid DID resource.`
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
  // If the light DID has been upgraded we consider the old key URI invalid, the full DID URI should be used instead.
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
    expectedVerificationMethodRelationship &&
    !didDocument[expectedVerificationMethodRelationship]?.some(
      (id) => id === verificationMethod.id
    )
  ) {
    throw new SDKErrors.DidError(
      `No verification method "${signer.fragment}" for the verification method "${expectedVerificationMethodRelationship}"`
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
 * @param input.verificationMethod The verification method used to generate the signature.
 * @returns A [[DidSignature]] object where signature is hex-encoded.
 */
export function signatureToJson({
  signature,
  verificationMethod,
}: SignResponseData): DidSignature {
  return {
    signature: Crypto.u8aToHex(signature),
    signerUrl: `${verificationMethod.controller}${verificationMethod.id}`,
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
  signerUrl: DidUrl
} {
  const signerUrl = (() => {
    if ('keyUri' in input) {
      return input.keyUri
    }
    if ('keyId' in input) {
      return input.keyId
    }
    return input.signerUrl
  })()
  const signature = Crypto.coToUInt8(input.signature)
  return { signature, signerUrl }
}

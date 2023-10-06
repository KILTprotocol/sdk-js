/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  CryptoCallbacksV2,
  DidDocumentV2,
  DidResolverV2,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'
import { multibaseKeyToDidKey, parse, validateUri } from './Did2.utils.js'
import { resolve } from './DidResolver/DidResolverV2.js'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  verificationMethodUri: DidDocumentV2.DidUrl
  expectedSigner?: DidDocumentV2.DidUri
  allowUpgraded?: boolean
  expectedVerificationMethodRelationship?: DidDocumentV2.SignatureVerificationMethodRelationship
  resolveDid?: DidResolverV2.ResolveDid<string>['resolve']
}

export type DidSignature = {
  signerUrl: DidDocumentV2.DidUrl
  signature: string
}

// Used solely for retro-compatibility with previously-generated DID signatures.
// It is reasonable to think that it will be removed at some point in the future.
type OldDidSignatureV1 = {
  signature: string
  keyId: DidDocumentV2.DidUrl
}
type OldDidSignatureV2 = {
  signature: string
  keyUri: DidDocumentV2.DidUrl
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

export async function verifyDidSignature({
  message,
  signature,
  verificationMethodUri,
  expectedSigner,
  allowUpgraded = false,
  expectedVerificationMethodRelationship,
  resolveDid = resolve,
}: DidSignatureVerificationInput): Promise<void> {
  // checks if key uri points to the right did; alternatively we could check the key's controller
  const signer = parse(verificationMethodUri)
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

  const { didDocument } = await resolveDid(verificationMethodUri, {})
  if (didDocument === undefined) {
    // TODO: Better error
    throw new Error(
      `Error validating the DID signature. Cannot fetch DID Document.`
    )
  }
  const verificationMethod = didDocument.verificationMethod.find(
    (vm) => vm.id === signer.fragment
  )
  if (verificationMethod === undefined) {
    // TODO: Better error
    throw new Error(
      `Cannot find verification method with ID "${signer.fragment} in the DID Document.`
    )
  }
  if (
    expectedVerificationMethodRelationship !== undefined &&
    didDocument[expectedVerificationMethodRelationship]?.find(
      (vm) => vm === signer.fragment
    ) === undefined
  ) {
    // TODO: Better error
    throw new Error(
      `Cannot find verification method with ID "${signer.fragment} for the relationship "${expectedVerificationMethodRelationship}".`
    )
  }

  const { publicKey } = multibaseKeyToDidKey(
    verificationMethod.publicKeyMultibase
  )
  Crypto.verify(message, signature, publicKey)
}

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

export function signatureToJson({
  did,
  signature,
  verificationMethod,
}: CryptoCallbacksV2.SignResponseData & {
  did: DidDocumentV2.DidUri
}): DidSignature {
  return {
    signature: Crypto.u8aToHex(signature),
    signerUrl: `${did}${verificationMethod.id}`,
  }
}

// TODO: JSDocs
export function signatureFromJson(
  input: DidSignature | OldDidSignatureV1 | OldDidSignatureV2
): Pick<CryptoCallbacksV2.SignResponseData, 'signature'> & {
  verificationMethodUri: DidDocumentV2.DidUrl
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

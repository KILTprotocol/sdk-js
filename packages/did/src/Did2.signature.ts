/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  CryptoCallbacksV2,
  DidDocumentV2,
  DidResolverV2,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  verificationMethodUri: DidDocumentV2.DidResourceUri
  expectedSigner?: DidDocumentV2.DidUri
  allowUpgraded?: boolean
  expectedVerificationMethodRelationship?: DidDocumentV2.SignatureVerificationMethodRelationship
  dereferenceDidUrl?: DidResolverV2.DereferenceDidUrl
}

export type DidSignature = {
  verificationMethod: DidDocumentV2.VerificationMethod
  signature: string
}

// Used solely for retro-compatibility with previously-generated DID signatures.
// It is reasonable to think that it will be removed at some point in the future.
type OldDidSignatureV1 = {
  signature: string
  keyId: DidDocumentV2.DidResourceUri
}
type OldDidSignatureV2 = {
  signature: string
  keyUri: DidDocumentV2.DidResourceUri
}

// TODO: JSDocs
export function signatureFromJson(
  input: DidSignature | OldDidSignatureV1 | OldDidSignatureV2
): Pick<CryptoCallbacksV2.SignResponseData, 'signature'> & {
  verificationMethodUri: DidDocumentV2.DidResourceUri
} {
  const verificationMethodUri = (() => {
    if ('keyUri' in input) {
      return input.keyUri
    }
    if ('keyId' in input) {
      return input.keyId
    }
    return `${input.verificationMethod.controller}${input.verificationMethod.id}` as DidDocumentV2.DidResourceUri
  })()
  const signature = Crypto.coToUInt8(input.signature)
  return { signature, verificationMethodUri }
}

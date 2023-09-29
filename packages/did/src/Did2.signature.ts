/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocumentV2,
  DidResolveKey,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'

export type DidSignatureVerificationInput = {
  message: string | Uint8Array
  signature: Uint8Array
  keyUri: DidDocumentV2.DidResourceUri
  expectedSigner?: DidDocumentV2.DidUri
  allowUpgraded?: boolean
  expectedVerificationMethod?: VerificationKeyRelationship
  didResolveKey?: DidResolveKey
}

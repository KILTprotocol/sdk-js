/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri } from '@kiltprotocol/types'

export interface JSigsSigner {
  sign: (data: { data: Uint8Array }) => Promise<Uint8Array>
  id?: string
}

export interface JSigsVerifier {
  verify: (data: {
    data: Uint8Array
    signature: Uint8Array
  }) => Promise<boolean>
  id?: string
}

export interface JSigsVerificationResult {
  verified: boolean
  error?: Error
  purposeResult?: { verified: boolean; error?: Error }
  verificationMethod?: { id: string; type: string; controller: DidUri }
}

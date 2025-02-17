/**
 * Copyright (c) 2025, KILT Foundation.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// Don't export `verifyAgainstCType`
export {
  fromClaim,
  getIdForCredential,
  verifyCredential,
} from './PublicCredential.js'
export * from './PublicCredential.chain.js'

export type { PublicCredentialCreationOptions } from './PublicCredential.js'

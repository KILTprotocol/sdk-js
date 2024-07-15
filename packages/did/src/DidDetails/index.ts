/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// We don't export the `add*VerificationMethod` functions, they are meant to be used internally
export type {
  BaseNewDidKey,
  DidEncryptionMethodType,
  DidSigningMethodType,
  DidVerificationMethodType,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  NewService,
  NewVerificationMethod,
} from './DidDetails.js'
export {
  isValidDidVerificationType,
  isValidEncryptionMethodType,
  signingMethodTypes
} from './DidDetails.js'
export * from './LightDidDetails.js'
export * from './FullDidDetails.js'

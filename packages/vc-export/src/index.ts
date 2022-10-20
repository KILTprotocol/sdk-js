/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @module @kiltprotocol/vc-export
 */

export * from './types.js'
export * as constants from './constants.js'
export * as verification from './verificationUtils.js'
export * as presentation from './presentationUtils.js'
export { fromCredentialAndAttestation } from './exportToVerifiableCredential.js'
export * as vcjsSuites from './vc-js/index.js'

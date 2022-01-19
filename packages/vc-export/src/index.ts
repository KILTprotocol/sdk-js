/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type * as types from './types.js'

export * as verification from './verificationUtils.js'
export * as presentation from './presentationUtils.js'
export { fromCredential } from './exportToVerifiableCredential.js'
export * as vcjsSuites from './vc-js/index.js'

export type { types }

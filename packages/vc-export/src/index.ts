/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import verification from './verificationUtils'
import presentation from './presentationUtils'
import { fromCredential } from './exportToVerifiableCredential'
import * as vcjsSuites from './vc-js'

import type * as types from './types'

export default {
  verification,
  presentation,
  fromCredential,
  vcjsSuites,
}

export { verification, presentation, fromCredential, vcjsSuites }
export type { types }

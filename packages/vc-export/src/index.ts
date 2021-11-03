/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import * as verification from './verificationUtils'
import * as presentation from './presentationUtils'
import { fromAttestedClaim } from './exportToVerifiableCredential'
import * as vcjsSuites from './vc-js'

import type * as types from './types'

export { verification, presentation, fromAttestedClaim, vcjsSuites }
export type { types }

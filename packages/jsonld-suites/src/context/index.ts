/**
 * Copyright (c) 2025, KILT Foundation.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { KiltCredentialV1 } from '@kiltprotocol/credentials'
import { context } from './context.js'

export const validationContexts = {
  [KiltCredentialV1.CONTEXT_URL]: context,
}

/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { constants } from '@kiltprotocol/core'
import { context } from './context.js'

export const validationContexts = {
  [constants.KILT_CREDENTIAL_CONTEXT_URL]: context,
}

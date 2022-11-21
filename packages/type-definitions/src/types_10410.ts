/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { subtype } from './subtype.js'
import { types2700 } from './types_2700.js'

export const types10410: RegistryTypes = {
  ...subtype(types2700, ['DispatchError']),
}

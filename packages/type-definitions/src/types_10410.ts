/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { mergeType } from './mergeType.js'
import { types2700 } from './types_2700.js'

export const types10410: RegistryTypes = mergeType(
  // Use the old types as the base of the new types.
  types2700,

  // We add these new type:
  {},

  // Remove old DID types:
  ['DispatchError']
)

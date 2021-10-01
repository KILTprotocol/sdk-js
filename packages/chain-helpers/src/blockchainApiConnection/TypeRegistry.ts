/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { types27 as KILT_TYPES } from '@kiltprotocol/type-definitions'
import { TypeRegistry } from '@polkadot/types'

const TYPE_REGISTRY = new TypeRegistry()
TYPE_REGISTRY.register(KILT_TYPES)

export default TYPE_REGISTRY
export { KILT_TYPES, TYPE_REGISTRY }

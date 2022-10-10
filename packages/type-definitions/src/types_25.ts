/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { types23 } from './types_23.js'

export const types25: RegistryTypes = {
  ...types23,
  DidAuthorizedCallOperation: {
    did: 'DidIdentifierOf',
    txCounter: 'u64',
    call: 'DidCallableOf',
    submitter: 'AccountId',
  },
}

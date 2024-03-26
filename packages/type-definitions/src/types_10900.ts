/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

import { types10800 } from './types_10800.js'

export const types10900: RegistryTypes = {
  ...types10800,
  // DID state_call v2
  DidApiAccountId: 'PalletDidLookupLinkableAccountLinkableAccountId',
}

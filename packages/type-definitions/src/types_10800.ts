/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

import { types10720 } from './types_10720.js'

export const types10800: RegistryTypes = {
  ...types10720,
  // DID state_call v2
  DidApiAccountId: 'PalletDidLookupLinkableAccountLinkableAccountId',
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

export const types10720: RegistryTypes = {
  // DID state_call
  DidApiAccountId: 'AccountId32',
  RawDidLinkedInfo: {
    identifier: 'AccountId32',
    accounts: 'Vec<DidApiAccountId>',
    w3n: 'Option<Text>',
    serviceEndpoints: 'Vec<DidServiceEndpointsDidEndpoint>',
    details: 'DidDidDetails',
  },
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

// Starting with this version we no longer need to define our custom types manually. They are contained in the runtime metadata.
// We therefore do not add the types of runtime version 2700 to the type definition here.
export const types10720: RegistryTypes = {
  // we need to keep the custom dispatch error since it was changed at some point

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

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall } from '@polkadot/types/types'

const runtime: DefinitionsCall = {
  DidApi: [
    {
      methods: {
        query_did_by_w3n: {
          description:
            'Return the information relative to the owner of the provided web3name, if any.',
          params: [
            {
              name: 'name',
              type: 'Text',
            },
          ],
          type: 'Option<RawDidLinkedInfo<AccountId32, AccountId32, AccountId32, Balance, Key, BlockNumber>>',
        },
        query_did_by_account_id: {
          description:
            'Return the information relative to the DID to which the provided account is linked, if any.',
          params: [
            {
              name: 'account',
              type: 'AccountId32',
            },
          ],
          type: 'Option<RawDidLinkedInfo<AccountId32, AccountId32, AccountId32, Balance, Key, BlockNumber>>',
        },
        query_did: {
          description:
            'Return the information relative to the owner of the provided DID, if present.',
          params: [
            {
              name: 'did',
              type: 'AccountId32',
            },
          ],
          type: 'Option<RawDidLinkedInfo<AccountId32, AccountId32, AccountId32, Balance, Key, BlockNumber>>',
        },
      },
      version: 1,
    },
  ],
  ParachainStakingApi: [
    {
      methods: {
        get_staking_rates: {
          description:
            'Calculate the current staking and reward rates for collators and delegators',
          params: [],
          type: 'StakingRates',
        },
        get_unclaimed_staking_rewards: {
          description:
            'Calculate the claimable staking rewards for a given account address',
          params: [
            {
              name: 'account',
              type: 'AccountId32',
            },
          ],
          type: 'Balance',
        },
      },
      version: 1,
    },
  ],
}

// eslint-disable-next-line import/no-default-export
export default runtime

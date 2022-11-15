/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall } from '@polkadot/types/types'

export const calls: DefinitionsCall = {
  Staking: [
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

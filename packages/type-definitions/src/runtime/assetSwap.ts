/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall } from '@polkadot/types/types'

export const calls: DefinitionsCall = {
  AssetSwap: [
    {
      methods: {
        pool_account_id: {
          description: '',
          params: [
            {
              name: 'remote_asset_id',
              type: 'XcmVersionedAssetId',
            },
          ],
          type: 'AccountId',
        },
      },
      version: 1,
    },
  ],
}

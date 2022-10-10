/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionRpc, DefinitionRpcSub } from '@polkadot/types/types'

export const rpc: Record<
  string,
  Record<string, DefinitionRpc | DefinitionRpcSub>
> = {
  did: {
    query: {
      description:
        'Return the DID information linked to the provided DID identifier, if found.',
      params: [
        {
          name: 'did',
          type: 'AccountId32',
        },
        {
          name: 'at',
          type: 'Hash',
          isOptional: true,
        },
      ],
      type: 'Option<DidLinkedInfo>',
    },
    queryByWeb3Name: {
      description:
        'Return the DID information linked to the provided web3name, if found.',
      params: [
        {
          name: 'name',
          type: 'String',
        },
        {
          name: 'at',
          type: 'Hash',
          isOptional: true,
        },
      ],
      type: 'Option<DidLinkedInfo>',
    },
    queryByAccount: {
      description:
        'Return the DID information linked to the provided account, if found.',
      params: [
        {
          name: 'account',
          type: 'PalletDidLookupLinkableAccountLinkableAccountId',
        },
        {
          name: 'at',
          type: 'Hash',
          isOptional: true,
        },
      ],
      type: 'Option<DidLinkedInfo>',
    },
  },
}

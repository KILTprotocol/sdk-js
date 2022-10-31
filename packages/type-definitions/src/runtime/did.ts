/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall, DefinitionCall } from '@polkadot/types/types'

const oldDidApiCalls: Record<string, DefinitionCall> = {
  query_did_by_w3n: {
    description:
      'Return the information relative to the owner of the provided web3name, if any.',
    params: [
      {
        name: 'name',
        type: 'Text',
      },
    ],
    type: 'Option<RawDidLinkedInfo>',
  },
  query_did_by_account_id: {
    description:
      'Return the information relative to the DID to which the provided account is linked, if any.',
    params: [
      {
        name: 'account',
        type: 'DidApiAccountId',
      },
    ],
    type: 'Option<RawDidLinkedInfo>',
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
    type: 'Option<RawDidLinkedInfo>',
  },
}

const newDidApiCalls: Record<string, DefinitionCall> = {
  query_by_web3_name: {
    description:
      'Return the information relative to the owner of the provided web3name, if any.',
    params: [
      {
        name: 'name',
        type: 'Text',
      },
    ],
    type: 'Option<RawDidLinkedInfo>',
  },
  query_by_account: {
    description:
      'Return the information relative to the DID to which the provided account is linked, if any.',
    params: [
      {
        name: 'account',
        type: 'DidApiAccountId',
      },
    ],
    type: 'Option<RawDidLinkedInfo>',
  },
  query: {
    description:
      'Return the information relative to the owner of the provided DID, if present.',
    params: [
      {
        name: 'did',
        type: 'AccountId32',
      },
    ],
    type: 'Option<RawDidLinkedInfo>',
  },
}

export const calls: DefinitionsCall = {
  DidApi: [
    {
      methods: {
        ...oldDidApiCalls,
      },
      version: 1,
    },
    // Same calls, since the type of AccountId is overwritten in the type definitions
    {
      methods: {
        ...oldDidApiCalls,
      },
      version: 2,
    },
  ],
  Did: [
    {
      methods: {
        ...newDidApiCalls,
      },
      version: 1,
    },
    // Same calls, since the type of AccountId is overwritten in the type definitions
    {
      methods: {
        ...newDidApiCalls,
      },
      version: 2,
    },
  ],
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DefinitionsCall, DefinitionCall } from '@polkadot/types/types'

const v1Calls: Record<string, DefinitionCall> = {
  query_did_by_w3n: {
    description:
      'Return the information relative to the owner of the provided web3name, if any.',
    params: [
      {
        name: 'name',
        type: 'Text',
      },
    ],
    type: 'Option<RawDidLinkedInfoV1>',
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
    type: 'Option<RawDidLinkedInfoV1>',
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
    type: 'Option<RawDidLinkedInfoV1>',
  },
}

const v2Calls: Record<string, DefinitionCall> = {
  query_did_by_w3n: {
    description:
      'Return the information relative to the owner of the provided web3name, if any.',
    params: [
      {
        name: 'name',
        type: 'Text',
      },
    ],
    type: 'Option<RawDidLinkedInfoV2>',
  },
  query_did_by_account_id: {
    description:
      'Return the information relative to the DID to which the provided account is linked, if any.',
    params: [
      {
        name: 'account',
        type: 'PalletDidLookupLinkableAccountLinkableAccountId',
      },
    ],
    type: 'Option<RawDidLinkedInfoV2>',
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
    type: 'Option<RawDidLinkedInfoV2>',
  },
}

export const calls: DefinitionsCall = {
  DidApi: [
    {
      methods: {
        ...v1Calls,
      },
      version: 1,
    },
    {
      methods: {
        ...v2Calls,
      },
      version: 2,
    },
  ],
}

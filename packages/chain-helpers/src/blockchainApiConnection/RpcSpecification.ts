/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * This module contains the Rpc specification for the KILT blockchain.
 *
 * @packageDocumentation
 * @module RpcSpecification
 */

export const RPC_SPEC = {
  did: {
    queryByWeb3Name: {
      description: '',
      params: [
        { name: 'web3name', type: 'String' },
        {
          name: 'at',
          type: 'Hash',
          isOptional: true,
        },
      ],
      type: 'RpcDidDocument',
    },
    queryByAccount: {
      description: '',
      params: [
        { name: 'account', type: 'AccountId' },
        {
          name: 'at',
          type: 'Hash',
          isOptional: true,
        },
      ],
      type: 'RpcDidDocument',
    },
    query: {
      description: '',
      params: [
        {
          name: 'did',
          type: 'DidIdentifier',
        },
        {
          name: 'at',
          type: 'Hash',
          isOptional: true,
        },
      ],
      type: 'RpcDidDocument',
    },
  },
}

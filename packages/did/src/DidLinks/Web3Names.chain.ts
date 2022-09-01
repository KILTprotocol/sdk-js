/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { PalletWeb3NamesWeb3NameWeb3NameOwnership } from '@polkadot/types/lookup'
import { Option } from '@polkadot/types-codec'
import type { DidUri, KiltAddress } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DecoderUtils } from '@kiltprotocol/utils'
import type { BN } from '@polkadot/util'

import * as DidUtils from '../Did.utils.js'
import { encodeDid } from '../Did.chain.js'

/**
 * Web3Name is the type of a nickname for a DID.
 */
export type Web3Name = string

/**
 * Retrieve the Web3Name for a specific DID uri.
 *
 * @param did DID of the web3name owner, i.e. 'did:kilt:4abc...'.
 * @returns The registered web3name for this DID if any.
 */
export async function queryWeb3NameForDid(
  did: DidUri
): Promise<Web3Name | null> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.web3Names.names(encodeDid(did))
  DecoderUtils.assertCodecIsType(encoded, ['Option<Bytes>'])
  return encoded.isSome ? encoded.unwrap().toUtf8() : null
}

/**
 * Decodes the DID of the owner of web3name.
 *
 * @param encoded The value returned by `api.query.web3Names.owner()`.
 * @returns The full DID uri, i.e. 'did:kilt:4abc...', if any.
 */
export function decodeWeb3NameOwner(
  encoded: Option<PalletWeb3NamesWeb3NameWeb3NameOwnership>
): {
  owner: DidUri
  deposit: {
    owner: KiltAddress
    amount: BN
  }
  claimedAt: BN
} {
  const { owner, deposit, claimedAt } = encoded.unwrap()
  return {
    owner: DidUtils.getFullDidUri(owner.toString() as KiltAddress),
    deposit: {
      owner: deposit.owner.toString() as KiltAddress,
      amount: deposit.amount.toBn(),
    },
    claimedAt: claimedAt.toBn(),
  }
}

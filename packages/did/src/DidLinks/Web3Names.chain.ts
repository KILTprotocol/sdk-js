/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { PalletWeb3NamesWeb3NameWeb3NameOwnership } from '@polkadot/types/lookup'
import type { Bytes, Option } from '@polkadot/types-codec'
import type { Deposit, DidUri } from '@kiltprotocol/types'
import type { BN } from '@polkadot/util'
import { depositFromChain, uriFromChain } from '../Did.chain.js'

/**
 * Web3Name is the type of a nickname for a DID.
 */
export type Web3Name = string

/**
 * Decodes the web3name of a DID.
 *
 * @param encoded The value returned by `api.query.web3Names.names()`.
 * @returns The registered web3name for this DID if any.
 */
export function web3NameFromChain(encoded: Option<Bytes>): Web3Name {
  return encoded.unwrap().toUtf8()
}

/**
 * Decodes the DID of the owner of web3name.
 *
 * @param encoded The value returned by `api.query.web3Names.owner()`.
 * @returns The full DID uri, i.e. 'did:kilt:4abc...', if any.
 */
export function web3NameOwnerFromChain(
  encoded: Option<PalletWeb3NamesWeb3NameWeb3NameOwnership>
): {
  owner: DidUri
  deposit: Deposit
  claimedAt: BN
} {
  const { owner, deposit, claimedAt } = encoded.unwrap()
  return {
    owner: uriFromChain(owner),
    deposit: depositFromChain(deposit),
    claimedAt: claimedAt.toBn(),
  }
}

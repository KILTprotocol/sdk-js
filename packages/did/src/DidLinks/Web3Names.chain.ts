/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { PalletWeb3NamesWeb3NameWeb3NameOwnership } from '@polkadot/types/lookup'
import { Bytes, Option } from '@polkadot/types-codec'
import type { DidUri, KiltAddress } from '@kiltprotocol/types'
import type { BN } from '@polkadot/util'

import * as DidUtils from '../Did.utils.js'

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
export function decodeWeb3Name(encoded: Option<Bytes>): Web3Name {
  return encoded.unwrap().toUtf8()
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

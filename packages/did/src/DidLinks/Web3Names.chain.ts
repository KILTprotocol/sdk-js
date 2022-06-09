/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  SubmittableExtrinsic,
  DidIdentifier,
  Deposit,
  IDidDetails,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DecoderUtils, SDKErrors } from '@kiltprotocol/utils'

import type { Option, Bytes, Struct, u128, u64, u32 } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'
import type { ApiPromise } from '@polkadot/api'
import type { BN } from '@polkadot/util'

import * as DidUtils from '../Did.utils.js'

/**
 * Web3NameOwner is a private interface for parsing the owner infos of a Web3Name from the on-chain format.
 */
interface Web3NameOwner extends Struct {
  owner: AccountId
  claimedAt: u64
  deposit: Deposit
}

/**
 *  Web3Name is the type of a nickname for a DID.
 */
export type Web3Name = string

function checkWeb3NameInputConstraints(
  api: ApiPromise,
  web3Name: Web3Name
): void {
  const [minLength, maxLength] = [
    (api.consts.web3Names.minNameLength as u32).toNumber(),
    (api.consts.web3Names.maxNameLength as u32).toNumber(),
  ]

  if (web3Name.length < minLength) {
    throw new SDKErrors.ERROR_WEB3_NAME_ERROR(
      `The provided name "${web3Name}" is shorter than the minimum number of characters allowed, which is ${minLength}.`
    )
  }
  if (web3Name.length > maxLength) {
    throw new SDKErrors.ERROR_WEB3_NAME_ERROR(
      `The provided name "${web3Name}" is longer than the maximum number of characters allowed, which is ${maxLength}.`
    )
  }
}

/**
 * Returns a extrinsic to claim a new web3name.
 *
 * @param name Web3Name that should be claimed.
 * The name must only contain ASCII characters and have a length in the inclusive range [3, 32].
 * @returns The SubmittableExtrinsic for the `claim` call.
 */
export async function getClaimTx(
  name: Web3Name
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  checkWeb3NameInputConstraints(blockchain.api, name)
  return blockchain.api.tx.web3Names.claim(name)
}

/**
 * Returns a extrinsic to release a web3name by its owner.
 *
 * @returns The SubmittableExtrinsic for the `releaseByOwner` call.
 */
export async function getReleaseByOwnerTx(): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.web3Names.releaseByOwner()
}

/**
 * Returns a extrinsic to release a web3name by the account that owns the deposit.
 *
 * @param name Web3Name that should be released.
 * The name must only contain ASCII characters and have a length in the inclusive range [3, 32].
 * @returns The SubmittableExtrinsic for the `reclaimDeposit` call.
 */
export async function getReclaimDepositTx(
  name: Web3Name
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  checkWeb3NameInputConstraints(blockchain.api, name)
  return blockchain.api.tx.web3Names.reclaimDeposit(name)
}

/**
 * Retrieve the Web3Name for a specific did identifier.
 *
 * @param didIdentifier DID identifier of the web3name owner, i.e. '4abc...'.
 * @returns The registered web3name for this DID if any.
 */
export async function queryWeb3NameForDidIdentifier(
  didIdentifier: DidIdentifier
): Promise<Web3Name | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.web3Names.names<Option<Bytes>>(
    didIdentifier
  )
  DecoderUtils.assertCodecIsType(encoded, ['Option<Bytes>'])
  return encoded.isSome ? encoded.unwrap().toUtf8() : null
}

/**
 * Retrieve the did identifier for a specific web3name.
 *
 * @param name Web3Name that should be resolved to a DID.
 * @returns The DID identifier for this web3name if any.
 */
export async function queryDidIdentifierForWeb3Name(
  name: Web3Name
): Promise<DidIdentifier | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.web3Names.owner<
    Option<Web3NameOwner>
  >(name)
  DecoderUtils.assertCodecIsType(encoded, [
    'Option<PalletWeb3NamesWeb3NameWeb3NameOwnership>',
  ])

  return encoded.isSome ? encoded.unwrap().owner.toString() : null
}

/**
 * Retrieve the Web3Name for a specific did uri.
 *
 * @param did DID of the web3name owner, i.e. 'did:kilt:4abc...'.
 * @returns The registered web3name for this DID if any.
 */
export async function queryWeb3NameForDid(
  did: IDidDetails['uri']
): Promise<Web3Name | null> {
  const details = DidUtils.parseDidUri(did)
  return queryWeb3NameForDidIdentifier(details.identifier)
}

/**
 * Retrieve the DID uri for a specific web3 name.
 *
 * @param name Web3 name that should be looked up.
 * @returns The full DID uri, i.e. 'did:kilt:4abc...', if any.
 */
export async function queryDidForWeb3Name(
  name: Web3Name
): Promise<IDidDetails['uri'] | null> {
  const identifier = await queryDidIdentifierForWeb3Name(name)
  if (identifier === null) {
    return null
  }
  return DidUtils.getKiltDidFromIdentifier(identifier, 'full')
}

/**
 * Retrieves the deposit amount to claim a web3 name as currently stored in the runtime.
 *
 * @returns The deposit amount. The value is indicated in femto KILTs.
 */
export async function queryDepositAmount(): Promise<BN> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return (api.consts.web3Names.deposit as u128).toBn()
}

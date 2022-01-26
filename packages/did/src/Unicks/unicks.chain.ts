/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { SubmittableExtrinsic, IDidDetails } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DecoderUtils } from '@kiltprotocol/utils'
import { DidUtils } from '@kiltprotocol/did'

import type { Option, Bytes } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'

/**
 *  Unick is the type of a nickname for a DID.
 */
type Unick = string

/**
 * Returns a extrinsic to claim a new unick.
 *
 * @param nick Unick that should be claimed.
 * @returns The [[SubmittableExtrinsic]] for the `claim` call.
 */
export async function getClaimTx(nick: Unick): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.claim(nick)
  return tx
}

/**
 * Returns a extrinsic to release a unick by its owner.
 *
 * @param nick Unick that should be released.
 * @returns The [[SubmittableExtrinsic]] for the `releaseByOwner` call.
 */
export async function getReleaseByOwnerTx(
  nick: Unick
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.releaseByOwner(nick)
  return tx
}

/**
 * Returns a extrinsic to release a unick by the account that owns the deposit.
 *
 * @param nick Unick that should be released.
 * @returns The [[SubmittableExtrinsic]] for the `releaseByPayer` call.
 */
export async function getReleaseByPayerTx(
  nick: Unick
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.releaseByPayer(nick)
  return tx
}

/**
 * Returns a extrinsic to put a nick on the list of banned nicks.
 *
 * @param nick Unick that should be banned.
 * @returns The [[SubmittableExtrinsic]] for the `ban` call.
 */
export async function getBanTx(nick: Unick): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.ban(nick)
  return tx
}

/**
 * Returns a extrinsic to remove a nick from the list of banned nicks.
 *
 * @param nick Unick that should be unbanned.
 * @returns The [[SubmittableExtrinsic]] for the `unban` call.
 */
export async function getUnbanTx(nick: Unick): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.unban(nick)
  return tx
}

/**
 * Retrieve the Unick for a specific did.
 *
 * @param didUri DID uri of the unick owner, i.e. 'did:kilt:4...'.
 * @returns The registered unick for this DID if any.
 */
export async function queryUnickForDid(didUri: string): Promise<Unick | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.unicks.unicks<Option<Bytes>>(
    didUri
  )
  DecoderUtils.assertCodecIsType(encoded, ['Option<Vec<u8>>'])
  return encoded.isSome ? encoded.unwrap().toUtf8() : null
}

/**
 * Retrieve the did for a specific unick.
 *
 * @param nick Unick that should be resolved to a DID.
 * @returns The DID uri for this unick if any.
 */
export async function queryDidForUnick(
  nick: Unick
): Promise<IDidDetails['did'] | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.unicks.owner<Option<AccountId>>(
    nick
  )
  DecoderUtils.assertCodecIsType(encoded, ['Option<AccountId32>'])
  return encoded.isSome
    ? DidUtils.getKiltDidFromIdentifier(encoded.unwrap().toString(), 'full')
    : null
}

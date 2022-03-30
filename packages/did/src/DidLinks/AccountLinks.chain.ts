/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  Deposit,
  IDidIdentifier,
  IIdentity,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { signatureVerify } from '@polkadot/util-crypto'
import type { Option, Struct, u128 } from '@polkadot/types'
import type {
  AccountId,
  Extrinsic,
  MultiSignature,
} from '@polkadot/types/interfaces'
import type { AnyNumber, Signer } from '@polkadot/types/types'
import type { HexString } from '@polkadot/util/types'
import { KeypairType } from '@polkadot/util-crypto/types'
import { BN } from '@polkadot/util'

// TODO: update with string pattern types once available
type AccountAddress = IIdentity['address']

interface ConnectionRecord extends Struct {
  did: AccountId
  deposit: Deposit
}

/// Type of signatures to link accounts to DIDs.
export type SignatureType = MultiSignature['type']

/* ### QUERY ### */

export async function getAccountLinkDepositInfo(
  linkedAccount: AccountId | AccountAddress
): Promise<Deposit | null> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedDid = await api.query.didLookup.connectedDids<
    Option<ConnectionRecord>
  >(linkedAccount)
  return connectedDid.isSome ? connectedDid.unwrap().deposit : null
}

export async function getConnectedDidForAccount(
  linkedAccount: AccountId | AccountAddress
): Promise<IDidIdentifier | null> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedDid = await api.query.didLookup.connectedDids<
    Option<ConnectionRecord>
  >(linkedAccount)
  return connectedDid.isNone ? null : connectedDid.unwrap().did.toString()
}

export async function getConnectedAccountsForDid(
  linkedDid: IDidIdentifier
): Promise<AccountAddress[]> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedAccountsRecords =
    await api.query.didLookup.connectedAccounts.keys<[AccountId, AccountId]>(
      linkedDid
    )
  return connectedAccountsRecords.map((account) => account.args[1].toString())
}

export async function checkConnected(
  didIdentifier: IDidIdentifier,
  account: AccountAddress
): Promise<boolean> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  // The following function returns something different than 0x00 if there is an entry for the provided key, 0x00 otherwise.
  const connectedEntry = await api.query.didLookup.connectedAccounts.hash(
    didIdentifier,
    account
  )
  // isEmpty returns true if there is no entry for the given key -> the function should return false.
  return !connectedEntry.isEmpty
}

/**
 * Retrieves the deposit amount to link an account to a DID as currently stored in the runtime.
 *
 * @returns The deposit amount. The value is indicated in femto KILTs.
 */
export async function queryDepositAmount(): Promise<BN> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return (api.consts.didLookup.deposit as u128).toBn()
}

/* ### EXTRINSICS ### */

/**
 * Signing (authorizing) this extrinsic with a FullDid and submitting it with an Account
 * will link Account to FullDid and remove any pre-existing links of Account.
 * Account must hold balance to cover for submission fees and storage deposit.
 *
 * @returns An [[Extrinsic]] that must be did-authorized.
 */
export async function getAssociateSenderTx(): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.didLookup.associateSender()
}

/**
 * Signing (authorizing) this extrinsic with a FullDid and submitting it with any Account
 * will link Account to FullDid and remove any pre-existing links of Account.
 * Account must give permission by signing a Tuple consisting of the identifier of FullDid
 * and a block number before which this signature is valid.
 * Account does not need to hold balance. The submitting account will pay and own the deposit for the link.
 *
 * @param account The account to link to the authorizing FullDid.
 * @param signatureValidUntilBlock The link request will be rejected if submitted later than this block number.
 * @param signature Account's signature over `Tuple(DidIdentifier, BlockNumber).toU8a()`.
 * @param sigType The type of key/substrate account which produced the `signature`.
 * @returns An [[Extrinsic]] that must be did-authorized.
 */
export async function getAccountSignedAssociationTx(
  account: AccountAddress | AccountId,
  signatureValidUntilBlock: AnyNumber,
  signature: Uint8Array | HexString,
  sigType: SignatureType
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.didLookup.associateAccount(account, signatureValidUntilBlock, {
    [sigType]: signature,
  })
}

/**
 * Returns a extrinsic to release an account link by the account that owns the deposit.
 * Must be signed and submitted by the deposit owner account.
 *
 * @param linkedAccount Account whose link should be released (not the deposit owner).
 * @returns The [[SubmittableExtrinsic]] for the `reclaimDeposit` call.
 */
export async function getReclaimDepositTx(
  linkedAccount: AccountAddress | AccountId
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.didLookup.reclaimDeposit(linkedAccount)
}

/**
 * Allows the submitting account to unilaterally remove its link to a Did.
 * This is not did-authorized, but directly submitted by the linked account.
 *
 * @returns A SubmittableExtrinsic that must be signed by the linked account.
 */
export async function getLinkRemovalByAccountTx(): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.didLookup.removeSenderAssociation()
}

/**
 * Allows the authorizing FullDid to unilaterally remove its link to a given account.
 * This must be did-authorized, but can be submitted by any account.
 *
 * @param linkedAccount An account linked to the FullDid which should be unlinked.
 * @returns An Extrinsic that must be did-authorized by the FullDid linked to `linkedAccount`.
 */
export async function getLinkRemovalByDidTx(
  linkedAccount: AccountAddress | AccountId
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.tx.didLookup.removeAccountAssociation(linkedAccount)
}

/* ### HELPERS ### */

function getMultiSignatureTypeFromKeypairType(
  keypairType: KeypairType
): SignatureType {
  switch (keypairType) {
    case 'ed25519':
      return 'Ed25519'
    case 'sr25519':
      return 'Sr25519'
    case 'ecdsa':
    case 'ethereum':
      return 'Ecdsa'
    default:
      throw new Error(`Unsupported signature algorithm '${keypairType}'`)
  }
}

/**
 * Builds an extrinsic to link `account` to a `did` where the fees and deposit are covered by some third account.
 * This extrinsic must be authorized using the [[FullDid]] whose `didIdentifier` was used here.
 * Note that in addition to the signing account and did used here, the submitting account will also be able to dissolve the link via reclaiming its deposit!
 *
 * @param accountAddress Address of the account to be linked.
 * @param accountSigner Signer interface that provides signing capabilities for the account with `accountAddress`.
 * @param didIdentifier Method-specific identifier [[FullDid]] to be linked.
 * @param nBlocksValid How many blocks into the future should the account-signed proof be considered valid?
 * @returns An Extrinsic that must be did-authorized by the [[FullDid]] whose identifier was used.
 */
export async function authorizeLinkWithAccount(
  accountAddress: AccountAddress,
  accountSigner: Signer,
  didIdentifier: IDidIdentifier,
  nBlocksValid = 10
): Promise<Extrinsic> {
  if (!accountSigner.signRaw) throw new Error()
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const blockNo = await api.query.system.number()
  const validTill = blockNo.addn(nBlocksValid)
  const signMe = api
    .createType('(AccountId, BlockNumber)', [didIdentifier, validTill])
    .toHex()
  const { signature } = await accountSigner.signRaw({
    data: signMe,
    address: accountAddress,
    type: 'bytes',
  })
  const { crypto, isValid } = signatureVerify(signMe, signature, accountAddress)
  if (!isValid && crypto !== 'none') throw new Error('signature not valid')
  const sigType = getMultiSignatureTypeFromKeypairType(crypto as KeypairType)
  return getAccountSignedAssociationTx(
    accountAddress,
    validTill,
    signature,
    sigType
  )
}

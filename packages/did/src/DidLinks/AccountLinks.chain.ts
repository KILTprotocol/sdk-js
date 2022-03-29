/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type {
  Deposit,
  IDidIdentifier,
  IIdentity,
  KeyringPair,
  KeystoreSigner,
  SubmittableExtrinsic,
  VerificationKeyType,
} from '@kiltprotocol/types'

import type { SignerOptions } from '@polkadot/api/types'
import type { Null, Option, Struct } from '@polkadot/types'
import type { AccountId, Extrinsic } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import type { HexString } from '@polkadot/util/types'

import type { DidAuthorizationOptions, FullDidDetails } from '../DidDetails'
import { getKiltDidFromIdentifier, parseDidUri } from '../Did.utils.js'

// TODO: update with string pattern types once available
type AccountAddress = IIdentity['address']
type DidUri = FullDidDetails['did']

interface ConnectionRecord extends Struct {
  did: AccountId
  deposit: Deposit
}

interface DepositJSON {
  amount: number
  owner: AccountAddress | null
}

/* ### QUERY ### */

export async function getAccountLinkDepositInfo(
  linkedAccount: AccountId | string
): Promise<DepositJSON> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedDid = await blockchain.api.query.didLookup.connectedDids<
    Option<ConnectionRecord>
  >(linkedAccount)
  const { owner, amount } = connectedDid.unwrapOrDefault().deposit
  return {
    amount: amount.toNumber(),
    owner: connectedDid.isSome ? owner.toString() : null,
  }
}

export async function getConnectedDidForAccount(
  linkedAccount: AccountId | string
): Promise<DidUri | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedDid = await blockchain.api.query.didLookup.connectedDids<
    Option<ConnectionRecord>
  >(linkedAccount)
  return connectedDid.isNone
    ? null
    : getKiltDidFromIdentifier(connectedDid.unwrap().did.toString(), 'full')
}

export async function getConnectedAccountsForDid(
  linkedDid: DidUri | IDidIdentifier
): Promise<AccountAddress[]> {
  const identifier = linkedDid.startsWith('did')
    ? parseDidUri(linkedDid).identifier
    : linkedDid
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedAccountsRecords =
    await blockchain.api.query.didLookup.connectedAccounts.keys<
      [AccountId, AccountId]
    >(identifier)
  return connectedAccountsRecords.map((account) => account.args[1].toString())
}

export async function checkConnected(
  did: DidUri | IDidIdentifier,
  account: AccountAddress
): Promise<boolean> {
  const identifier = did.startsWith('did') ? parseDidUri(did).identifier : did
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedEntry = await blockchain.api.query.didLookup.connectedAccounts<
    Option<Null>
  >(identifier, account)
  return connectedEntry.isSome
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
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.didLookup.associateSender()
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
 * @param signature Account's signature over Tuple(DidIdentifier, BlockNumber).toU8a().
 * @param keyType The type of key/substrate account which produced the `signature`.
 * @returns An [[Extrinsic]] that must be did-authorized.
 */
export async function getAccountSignedAssociationTx(
  account: AccountAddress | AccountId,
  signatureValidUntilBlock: AnyNumber,
  signature: Uint8Array | HexString,
  keyType: VerificationKeyType
): Promise<Extrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.didLookup.associateAccount(
    account,
    signatureValidUntilBlock,
    { [keyType]: signature }
  )
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
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.didLookup.reclaimDeposit(linkedAccount)
}

/**
 * Allows the submitting account to unilaterally remove its link to a Did.
 * This is not did-authorized, but directly submitted by the linked account.
 *
 * @returns A SubmittableExtrinsic that must be signed by the linked account.
 */
export async function getLinkRemovalByAccountTx(): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.didLookup.removeSenderAssociation()
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
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.didLookup.removeAccountAssociation(linkedAccount)
}

/* ### HIGH-LEVEL HELPERS ### */

/**
 * Builds an extrinsic to link `account` to `did`, where `account` must hold balance to cover for the transaction fees and deposit.
 *
 * @param account KeyringPair of the account to be linked, used for signing the did-authorized extrinsic.
 * @param did FullDid to be linked, used for did-authorization.
 * @param didSignCallback Keystore or callback that manages the FullDid's keys.
 * @param signingOpts Options to be passed on to `FullDid.authorizeExtrinsic` & `Extrinsic.signAsync`.
 * @returns A signed SubmittableExtrinsic ready to be submitted.
 */
export async function linkSubmitterAccount(
  account: KeyringPair,
  did: FullDidDetails,
  didSignCallback: KeystoreSigner,
  signingOpts: DidAuthorizationOptions & Partial<SignerOptions> = {}
): Promise<SubmittableExtrinsic> {
  const tx = await getAssociateSenderTx()
  const authorized = await did.authorizeExtrinsic(
    tx,
    didSignCallback,
    account.address,
    signingOpts
  )
  return authorized.signAsync(account, signingOpts)
}

/**
 * Builds an extrinisc to link `account` to a `did` where the fees and deposit are covered by some third account.
 *
 * @param account KeyringPair of the account to be linked, used for signing a proof of authorization.
 * @param submitterAccount Address of the submitter account that will pay the deposit and fees. This account will also be able to dissolve the link!
 * @param did FullDid to be linked, used for did-authorization.
 * @param didSignCallback Keystore or callback that manages the FullDid's keys.
 * @param opts Options, including signing options to be passed on to `FullDid.authorizeExtrinsic`.
 * @param opts.nBlocksValid How many blocks into the future should the account-signed proof be considered valid?
 * @returns A SubmittableExtrinsic that can be signed & submitted by `submitterAccount`.
 */
export async function linkAccountToDid(
  account: KeyringPair,
  submitterAccount: AccountAddress,
  did: FullDidDetails,
  didSignCallback: KeystoreSigner,
  {
    nBlocksValid = 10,
    ...didSigningOpts
  }: { nBlocksValid?: number } & DidAuthorizationOptions = {}
): Promise<SubmittableExtrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const blockNo = await api.query.system.number()
  const validTill = blockNo.addn(nBlocksValid)
  const signMe = api
    .createType('(AccountId, BlockNumber)', [did.identifier, validTill])
    .toU8a()
  const signature = account.sign(signMe, { withType: false })
  const tx = await getAccountSignedAssociationTx(
    account.address,
    validTill,
    signature,
    account.type as VerificationKeyType
  )
  return did.authorizeExtrinsic(
    tx,
    didSignCallback,
    submitterAccount,
    didSigningOpts
  )
}

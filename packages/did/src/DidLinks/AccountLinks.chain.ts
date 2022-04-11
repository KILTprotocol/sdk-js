/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  Deposit,
  DidIdentifier,
  IIdentity,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { encodeAddress, signatureVerify } from '@polkadot/util-crypto'
import type { Option, Struct, u128 } from '@polkadot/types'
import type {
  AccountId,
  BlockNumber,
  Extrinsic,
  MultiSignature,
} from '@polkadot/types/interfaces'
import type { AnyNumber, TypeDef } from '@polkadot/types/types'
import type { HexString } from '@polkadot/util/types'
import { KeypairType, VerifyResult } from '@polkadot/util-crypto/types'
import { assert, BN, u8aToHex, u8aToU8a, u8aWrapBytes } from '@polkadot/util'
import Keyring from '@polkadot/keyring'

import { queryWeb3NameForDidIdentifier, Web3Name } from './Web3Names.chain.js'

// TODO: update with string pattern types once available
/// A KILT-chain specific address, encoded with the KILT 38 network prefix.
export type KiltAddress = IIdentity['address']
/// A chain-agnostic address, which can be encoded using any network prefix.
export type SubstrateAddress = IIdentity['address']

export type Address = KiltAddress | SubstrateAddress

interface ConnectionRecord extends Struct {
  did: Address
  deposit: Deposit
}

/// Type of signatures to link accounts to DIDs.
export type SignatureType = MultiSignature['type']

/**
 * Type of a linking payload signing function.
 *
 * It takes the HEX-encoded tuple (DidIdentifier, BlockNumber) and expects the HEX-encoded signature generated by the provided address in return.
 */
export type LinkingSignerCallback = (
  encodedLinkingDetails: HexString,
  address: KiltAddress
) => Promise<HexString>

/* ### QUERY ### */

/**
 * Gets deposit information for a given account link.
 *
 * @param linkedAccount The linked account.
 * @returns Deposit info giving amount and owner of deposit, null if this account is not linked.
 */
export async function queryAccountLinkDepositInfo(
  linkedAccount: Address
): Promise<Deposit | null> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedDid = await api.query.didLookup.connectedDids<
    Option<ConnectionRecord>
  >(linkedAccount)
  return connectedDid.isSome ? connectedDid.unwrap().deposit : null
}

/**
 * Return the identifier of the DID linked to the provided account, if present.
 *
 * @param linkedAccount The account to use for the lookup.
 * @returns The linked DID identifier if present, or null otherwise.
 */
export async function queryConnectedDidForAccount(
  linkedAccount: Address
): Promise<DidIdentifier | null> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedDid = await api.query.didLookup.connectedDids<
    Option<ConnectionRecord>
  >(linkedAccount)
  return connectedDid.isNone ? null : connectedDid.unwrap().did.toString()
}

/**
 * Return all the accounts linked to the provided DID identifier.
 *
 * @param linkedDid The DID to use for the lookup.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @returns A list of addresses to accounts linked to the DID, encoded using `networkPrefix`.
 */
export async function queryConnectedAccountsForDid(
  linkedDid: DidIdentifier,
  networkPrefix = 38
): Promise<Array<KiltAddress | SubstrateAddress>> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const connectedAccountsRecords =
    await api.query.didLookup.connectedAccounts.keys<[AccountId, AccountId]>(
      linkedDid
    )
  return connectedAccountsRecords.map((account) =>
    encodeAddress(account.args[1], networkPrefix)
  )
}

/**
 * Return the Web3 name associated with the given account, if present.
 *
 * @param linkedAccount The account to use for the lookup.
 * @returns The Web3 name linked to the given account, or `null` otherwise.
 */
export async function queryWeb3Name(
  linkedAccount: Address
): Promise<Web3Name | null> {
  // TODO: Replace with custom RPC call when available.
  const linkedDid = await queryConnectedDidForAccount(linkedAccount)
  if (!linkedDid) {
    return null
  }
  return queryWeb3NameForDidIdentifier(linkedDid)
}

/**
 * Return true whether the provided account has been linked to the provided DID.
 *
 * @param didIdentifier The DID to use for the lookup.
 * @param account The account to use for the lookup.
 * @returns True if the DID and account is linked, false otherwise.
 */
export async function queryIsConnected(
  didIdentifier: DidIdentifier,
  account: Address
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
 * Account must give permission by signing a Scale-encoded tuple consisting of the FullDid identifier
 * and a block number representing the expiration block of the signature (after which it cannot be submitted anymore).
 * Account does not need to hold balance. The submitting account will pay and own the deposit for the link.
 *
 * @param account The account to link to the authorizing FullDid.
 * @param signatureValidUntilBlock The link request will be rejected if submitted later than this block number.
 * @param signature Account's signature over `(DidIdentifier, BlockNumber).toU8a()`.
 * @param sigType The type of key/substrate account which produced the `signature`.
 * @returns An [[Extrinsic]] that must be did-authorized.
 */
export async function getAccountSignedAssociationTx(
  account: Address,
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
  linkedAccount: Address
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
  linkedAccount: Address
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
      return 'Ecdsa'
    default:
      throw new Error(`Unsupported signature algorithm '${keypairType}'`)
  }
}

/**
 * Return the default signer callback, which uses the address argument to crete a signing closure for the given payload.
 *
 * @param keyring The [[Keyring]] to retrieve the signing key.
 * @returns The signature generating callback that uses the keyring to sign the input payload using the input address.
 */
export function defaultSignerCallback(keyring: Keyring): LinkingSignerCallback {
  return (payload: HexString, address: Address): Promise<HexString> =>
    Promise.resolve(
      u8aToHex(keyring.getPair(address).sign(payload, { withType: false }))
    )
}

/**
 * Builds an extrinsic to link `account` to a `did` where the fees and deposit are covered by some third account.
 * This extrinsic must be authorized using the [[FullDid]] whose `didIdentifier` was used here.
 * Note that in addition to the signing account and did used here, the submitting account will also be able to dissolve the link via reclaiming its deposit!
 *
 * @param accountAddress Address of the account to be linked.
 * @param didIdentifier Method-specific identifier [[FullDid]] to be linked.
 * @param signingCallback The signature generation callback that generates the account signature over the encoded (DidIdentifier, BlockNumber) tuple.
 * @param nBlocksValid How many blocks into the future should the account-signed proof be considered valid?
 * @returns An Extrinsic that must be did-authorized by the [[FullDid]] whose identifier was used.
 */
export async function authorizeLinkWithAccount(
  accountAddress: Address,
  didIdentifier: DidIdentifier,
  signingCallback: LinkingSignerCallback,
  nBlocksValid = 10
): Promise<Extrinsic> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const blockNo: BlockNumber = await api.query.system.number()
  const validTill = blockNo.addn(nBlocksValid)
  // Gets the current definition of BlockNumber (second tx argument) from the metadata.
  const blockNumberType =
    api.tx.didLookup.associateAccount.meta.args[1].type.toString()
  // This is some magic on the polkadot types internals to get the DidIdentifier definition from the metadata.
  // We get it from the connectedAccounts storage, which is a double map from (DidIdentifier, Account) -> Null.
  const didIdentifierType = (
    api.registry.lookup.getTypeDef(
      // gets the type id of the keys on the connectedAccounts storage (which is a double map).
      api.query.didLookup.connectedAccounts.creator.meta.type.asMap.key
    ).sub as TypeDef[]
  )[0].type // get the type of the first key, which is the DidIdentifier
  const encodedDetails = api
    .createType(`(${didIdentifierType}, ${blockNumberType})`, [
      didIdentifier,
      validTill,
    ])
    .toU8a()
  const paddedDetails = u8aToHex(u8aWrapBytes(encodedDetails))
  // The signature may be prefixed; so we try to verify the signature without the prefix first.
  // If it fails, we try the same with the prefix and return the result of the second operation.
  let signature = u8aToU8a(await signingCallback(paddedDetails, accountAddress))
  let result: VerifyResult
  try {
    result = signatureVerify(
      paddedDetails,
      signature.subarray(1),
      accountAddress
    )
    // We discard this error message, as the error is caught in the catch block
    assert(result.isValid, '')
    // Remove type from signature if did not fail to verify
    signature = signature.subarray(1)
  } catch {
    // Otherwise, try to verify the whole signature
    result = signatureVerify(paddedDetails, signature, accountAddress)
    assert(result.isValid, 'signature not valid')
  }
  const { crypto } = result

  const sigType = getMultiSignatureTypeFromKeypairType(crypto as KeypairType)
  return getAccountSignedAssociationTx(
    accountAddress,
    validTill,
    signature,
    sigType
  )
}

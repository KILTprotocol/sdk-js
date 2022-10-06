/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  decodeAddress,
  encodeAddress,
  ethereumEncode,
  signatureVerify,
} from '@polkadot/util-crypto'
import type { Enum, Option, StorageKey, U8aFixed } from '@polkadot/types'
import type { AccountId32 } from '@polkadot/types/interfaces'
import type { AnyNumber, Codec, TypeDef } from '@polkadot/types/types'
import type { HexString } from '@polkadot/util/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { KeypairType } from '@polkadot/util-crypto/types'
import {
  stringToU8a,
  U8A_WRAP_ETHEREUM,
  u8aConcatStrict,
  u8aToHex,
  u8aWrapBytes,
} from '@polkadot/util'
import { ApiPromise } from '@polkadot/api'

import { SDKErrors, ss58Format } from '@kiltprotocol/utils'
import type { Deposit, DidUri, KiltAddress } from '@kiltprotocol/types'
import type {
  DidLinkedInfo,
  PalletDidLookupConnectionRecord,
} from '@kiltprotocol/augment-api'
import { ConfigService } from '@kiltprotocol/config'

import { EncodedSignature } from '../Did.utils.js'
import {
  depositFromChain,
  fromChain,
  toChain,
  Web3Name,
  web3NameFromChain,
} from '../Did.chain.js'

/// A chain-agnostic address, which can be encoded using any network prefix.
export type SubstrateAddress = KeyringPair['address']

export type EthereumAddress = HexString

export type Address = KiltAddress | SubstrateAddress | EthereumAddress

type EncodedMultiAddress =
  | { AccountId20: Uint8Array }
  | { AccountId32: Uint8Array }

/**
 * Type describing storage type that is yet to be deployed to spiritnet.
 */
interface PalletDidLookupLinkableAccountLinkableAccountId extends Enum {
  readonly isAccountId20: boolean
  readonly asAccountId20: U8aFixed
  readonly isAccountId32: boolean
  readonly asAccountId32: AccountId32
  readonly type: 'AccountId20' | 'AccountId32'
}

/**
 * Detects whether api decoration indicates presence of Ethereum linking enabled pallet.
 *
 * @param api The api object.
 * @returns True if Ethereum linking is supported.
 */
function isEthereumEnabled(api: ApiPromise): boolean {
  const removeType = api.createType(
    api.tx.didLookup.removeAccountAssociation.meta.args[0]?.type?.toString() ||
      'bool'
  )
  const associateType = api.createType(
    api.tx.didLookup.associateAccount.meta.args[0]?.type?.toString() || 'bool'
  )

  return 'isAccountId20' in removeType || 'isEthereum' in associateType
}

/**
 * Prepares encoding a LinkableAccountId.
 *
 * @param address 20 or 32 byte address as string (hex or ss58 encoded).
 * @returns `{ AccountId20 | AccountId32: Uint8Array }`.
 */
function encodeMultiAddress(address: Address): EncodedMultiAddress {
  const accountDecoded = decodeAddress(address)
  const isEthereumAddress = accountDecoded.length === 20
  return isEthereumAddress
    ? { AccountId20: accountDecoded }
    : { AccountId32: accountDecoded }
}

/* ### QUERY ### */

/**
 * Format a blockchain address to be used as a parameter for the blockchain API functions.
 *
 * @param account The account to format.
 * @returns The blockchain-formatted account.
 */
export function accountToChain(account: Address): Address {
  const api = ConfigService.get('api')
  if (!isEthereumEnabled(api)) {
    // No change for the old blockchain version
    return account
  }
  const encoded: EncodedMultiAddress = encodeMultiAddress(account)
  // Force type cast to enable the old blockchain types to accept the future format
  return encoded as unknown as Address
}

/**
 * Decodes the information about the connection between an address and a DID.
 *
 * @param encoded The output of `api.query.didLookup.connectedDids()`.
 * @returns The connection details.
 */
export function connectedDidFromChain(
  encoded: Option<PalletDidLookupConnectionRecord>
): {
  did: DidUri
  deposit: Deposit
} {
  const { did, deposit } = encoded.unwrap()
  return {
    did: fromChain(did),
    deposit: depositFromChain(deposit),
  }
}

function isLinkableAccountId(
  arg: Codec
): arg is PalletDidLookupLinkableAccountLinkableAccountId {
  return 'isAccountId32' in arg && 'isAccountId20' in arg
}

function accountFromChain(
  account: AccountId32,
  networkPrefix = ss58Format
): KiltAddress | SubstrateAddress {
  if (isLinkableAccountId(account)) {
    // linked account is substrate address (ethereum-enabled storage version)
    if (account.isAccountId32)
      return encodeAddress(account.asAccountId32, networkPrefix)
    // linked account is ethereum address (ethereum-enabled storage version)
    if (account.isAccountId20) return ethereumEncode(account.asAccountId20)
  }
  // linked account is substrate account (legacy storage version)
  return encodeAddress(account.toU8a(), networkPrefix)
}

/**
 * Decodes the accounts linked to the provided DID.
 *
 * @param encoded The data returned by `api.query.didLookup.connectedAccounts.keys()`.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @returns A list of addresses of accounts, encoded using `networkPrefix`.
 */
export function connectedAccountsFromChain(
  encoded: Array<StorageKey<[AccountId32, AccountId32]>>,
  networkPrefix = ss58Format
): Array<KiltAddress | SubstrateAddress> {
  return encoded.map<string>(({ args: [, accountAddress] }) =>
    accountFromChain(accountAddress, networkPrefix)
  )
}

/**
 * Decodes accounts, DID, and web3name linked to the provided account.
 *
 * @param encoded The data returned by `api.rpc.did.queryByAccount()`.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @returns The accounts, DID, and web3name.
 */
export function queryByAccountFromChain(
  encoded: Option<DidLinkedInfo>,
  networkPrefix = ss58Format
): {
  did: DidUri
  accounts: Array<KiltAddress | SubstrateAddress>
  web3name?: Web3Name
} {
  const { accounts, identifier, w3n } = encoded.unwrap()
  return {
    did: fromChain(identifier),
    accounts: accounts.map((account) =>
      accountFromChain(account, networkPrefix)
    ),
    web3name: w3n.isSome ? w3n.unwrap().toString() : undefined,
  }
}

/**
 * Return the Web3 name associated with the given account, if present.
 *
 * @param linkedAccount The account to use for the lookup.
 * @returns The Web3 name linked to the given account, or throws Error otherwise.
 */
export async function fetchWeb3Name(linkedAccount: Address): Promise<Web3Name> {
  const api = ConfigService.get('api')
  // TODO: Replace with custom RPC call when available.
  const encoded = await api.query.didLookup.connectedDids(
    accountToChain(linkedAccount)
  )
  return web3NameFromChain(
    await api.query.web3Names.names(encoded.unwrap().did)
  )
}

/* ### EXTRINSICS ### */

type AssociateAccountToChainResult = [string, AnyNumber, EncodedSignature]

/* ### HELPERS ### */

function getUnprefixedSignature(
  message: HexString,
  signature: Uint8Array,
  address: Address
): { signature: Uint8Array; type: KeypairType } {
  try {
    // try to verify the signature without the prefix first
    const unprefixed = signature.subarray(1)
    const { crypto, isValid } = signatureVerify(message, unprefixed, address)
    if (isValid) {
      return {
        signature: unprefixed,
        type: crypto as KeypairType,
      }
    }
  } catch {
    // if it fails, maybe the signature prefix caused that, so we try to verify the whole signature
  }

  const { crypto, isValid } = signatureVerify(message, signature, address)
  if (isValid) {
    return {
      signature,
      type: crypto as KeypairType,
    }
  }

  throw new SDKErrors.SignatureUnverifiableError()
}

/**
 * Builds the parameters for an extrinsic to link the `account` to the `did` where the fees and deposit are covered by some third account.
 * This extrinsic must be authorized using the same full DID.
 * Note that in addition to the signing account and DID used here, the submitting account will also be able to dissolve the link via reclaiming its deposit!
 *
 * @param accountAddress Address of the account to be linked.
 * @param did Full DID to be linked.
 * @param sign The sign callback that generates the account signature over the encoded (DidAddress, BlockNumber) tuple.
 * @param nBlocksValid The link request will be rejected if submitted later than (current block number + nBlocksValid)?
 * @returns An array of parameters for `api.tx.didLookup.associateAccount` that must be DID-authorized by the full DID used.
 */
export async function associateAccountToChainArgs(
  accountAddress: Address,
  did: DidUri,
  sign: (encodedLinkingDetails: HexString) => Promise<Uint8Array>,
  nBlocksValid = 10
): Promise<AssociateAccountToChainResult> {
  const api = ConfigService.get('api')

  const blockNo = await api.query.system.number()
  const validTill = blockNo.addn(nBlocksValid)

  // Gets the current definition of BlockNumber (second tx argument) from the metadata.
  const BlockNumber =
    api.tx.didLookup.associateAccount.meta.args[1].type.toString()
  // This is some magic on the polkadot types internals to get the DidAddress definition from the metadata.
  // We get it from the connectedAccounts storage, which is a double map from (DidAddress, Account) -> Null.
  const DidAddress = (
    api.registry.lookup.getTypeDef(
      // gets the type id of the keys on the connectedAccounts storage (which is a double map).
      api.query.didLookup.connectedAccounts.creator.meta.type.asMap.key
    ).sub as TypeDef[]
  )[0].type // get the type of the first key, which is the DidAddress

  const encoded = api
    .createType(`(${DidAddress}, ${BlockNumber})`, [toChain(did), validTill])
    .toU8a()

  const isAccountId32 = decodeAddress(accountAddress).length > 20
  const length = stringToU8a(String(encoded.length))
  const paddedDetails = u8aToHex(
    isAccountId32
      ? u8aWrapBytes(encoded)
      : u8aConcatStrict([U8A_WRAP_ETHEREUM, length, encoded])
  )

  const { signature, type } = getUnprefixedSignature(
    paddedDetails,
    await sign(paddedDetails),
    accountAddress
  )

  const proof = { [type]: signature } as EncodedSignature

  if (isEthereumEnabled(api)) {
    if (type === 'ethereum') {
      const result = [{ Ethereum: [accountAddress, signature] }, validTill]
      // Force type cast to enable the old blockchain types to accept the future format
      return result as unknown as AssociateAccountToChainResult
    }
    const result = [{ Dotsama: [accountAddress, proof] }, validTill]
    // Force type cast to enable the old blockchain types to accept the future format
    return result as unknown as AssociateAccountToChainResult
  }

  if (type === 'ethereum')
    throw new SDKErrors.CodecMismatchError(
      'Ethereum linking is not yet supported by this chain'
    )

  return [accountAddress, validTill, proof]
}

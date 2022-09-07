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
import type { bool, Enum, Option, u64, U8aFixed } from '@polkadot/types'
import type { AccountId32, Extrinsic } from '@polkadot/types/interfaces'
import type { AnyNumber, Codec, TypeDef } from '@polkadot/types/types'
import type { HexString } from '@polkadot/util/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { KeypairType } from '@polkadot/util-crypto/types'
import {
  stringToU8a,
  u8aConcatStrict,
  u8aToHex,
  u8aWrapBytes,
  U8A_WRAP_ETHEREUM,
} from '@polkadot/util'
import type {
  AugmentedQuery,
  AugmentedQueryDoubleMap,
  AugmentedSubmittable,
} from '@polkadot/api/types'
import { ApiPromise } from '@polkadot/api'

import { SDKErrors, ss58Format } from '@kiltprotocol/utils'
import type {
  Deposit,
  DidUri,
  KiltAddress,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import type { PalletDidLookupConnectionRecord } from '@kiltprotocol/augment-api'
import { ConfigService } from '@kiltprotocol/config'

import { EncodedSignature, getFullDidUri } from '../Did.utils.js'
import { decodeWeb3Name, Web3Name } from './Web3Names.chain.js'
import { decodeDeposit, encodeDid } from '../Did.chain.js'

/// A chain-agnostic address, which can be encoded using any network prefix.
export type SubstrateAddress = KeyringPair['address']

export type EthereumAddress = HexString

export type Address = KiltAddress | SubstrateAddress | EthereumAddress

/**
 * Type of a linking payload signing function.
 *
 * It takes the HEX-encoded tuple (DidAddress, BlockNumber) and returns the Uint8Array signature generated by the provided address.
 */
export type LinkingSignCallback = (
  encodedLinkingDetails: HexString
) => Promise<Uint8Array>

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

type AssociateAccountRequestValue = [
  string | Uint8Array, // AccountId
  string | Uint8Array | EncodedSignature // signature
]

/**
 * Type required for encoding Enum type for association request extrinsics.
 */
type AssociateAccountRequest =
  | { Dotsama: AssociateAccountRequestValue }
  | { Ethereum: AssociateAccountRequestValue }

/**
 * Api augmentation override for when the ethereum enabled pallet version has landed.
 */
type WithEtherumSupport = {
  tx: {
    didLookup: {
      associateAccount: AugmentedSubmittable<
        (
          req: AssociateAccountRequest,
          expiration: u64 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic
      >
      removeAccountAssociation: AugmentedSubmittable<
        (account: EncodedMultiAddress) => SubmittableExtrinsic,
        [PalletDidLookupLinkableAccountLinkableAccountId]
      >
    }
  }
  query: {
    didLookup: {
      connectedDids: AugmentedQuery<
        'promise',
        (arg: EncodedMultiAddress) => Option<PalletDidLookupConnectionRecord>,
        [PalletDidLookupLinkableAccountLinkableAccountId]
      >
      connectedAccounts: AugmentedQueryDoubleMap<
        'promise',
        (
          didId: string | Uint8Array,
          accountId: EncodedMultiAddress
        ) => Option<bool>,
        [AccountId32, PalletDidLookupLinkableAccountLinkableAccountId]
      >
    }
  }
}

/**
 * Detects whether api augmentation indicates presence of Ethereum linking enabled pallet.
 *
 * @param api The api object.
 * @returns True if Ethereum linking is supported.
 */
function isEthereumEnabled(api: unknown): api is WithEtherumSupport {
  return (
    api instanceof ApiPromise &&
    ('isAccountId20' in
      api.createType(
        api.tx.didLookup.removeAccountAssociation.meta.args[0]?.type?.toString() ||
          'bool'
      ) ||
      'isEthereum' in
        api.createType(
          api.tx.didLookup.associateAccount.meta.args[0]?.type?.toString() ||
            'bool'
        ))
  )
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

export async function queryConnectedDid(
  linkedAccount: Address
): Promise<Option<PalletDidLookupConnectionRecord>> {
  const api = ConfigService.get('api')
  if (isEthereumEnabled(api)) {
    return api.query.didLookup.connectedDids(encodeMultiAddress(linkedAccount))
  }
  return api.query.didLookup.connectedDids(linkedAccount)
}

/**
 * Decodes the information about the connection between an address and a DID.
 *
 * @param encoded The output of `api.query.didLookup.connectedDids()`.
 * @returns The connection details.
 */
export function decodeConnectedDid(
  encoded: Option<PalletDidLookupConnectionRecord>
): {
  did: DidUri
  deposit: Deposit
} {
  const { did, deposit } = encoded.unwrap()
  return {
    did: getFullDidUri(did.toString() as KiltAddress),
    deposit: decodeDeposit(deposit),
  }
}

function isLinkableAccountId(
  arg: Codec
): arg is PalletDidLookupLinkableAccountLinkableAccountId {
  return 'isAccountId32' in arg && 'isAccountId20' in arg
}

/**
 * Return all the accounts linked to the provided DID.
 *
 * @param linkedDid The DID to use for the lookup.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @returns A list of addresses of accounts linked to the DID, encoded using `networkPrefix`.
 */
export async function queryConnectedAccountsForDid(
  linkedDid: DidUri,
  networkPrefix = ss58Format
): Promise<Array<KiltAddress | SubstrateAddress>> {
  const api = ConfigService.get('api')
  const connectedAccountsRecords =
    await api.query.didLookup.connectedAccounts.keys(encodeDid(linkedDid))
  return connectedAccountsRecords.map<string>(
    ({ args: [, accountAddress] }) => {
      if (isLinkableAccountId(accountAddress)) {
        // linked account is substrate address (ethereum-enabled storage version)
        if (accountAddress.isAccountId32)
          return encodeAddress(accountAddress.asAccountId32, networkPrefix)
        // linked account is ethereum address (ethereum-enabled storage version)
        if (accountAddress.isAccountId20)
          return ethereumEncode(accountAddress.asAccountId20)
      }
      // linked account is substrate account (legacy storage version)
      return encodeAddress(accountAddress.toU8a(), networkPrefix)
    }
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
  const api = ConfigService.get('api')
  // TODO: Replace with custom RPC call when available.
  const encoded = await queryConnectedDid(linkedAccount)
  if (encoded.isNone) {
    return null
  }
  const { did } = decodeConnectedDid(encoded)
  return decodeWeb3Name(await api.query.web3Names.names(encodeDid(did)))
}

/**
 * Return true whether the provided account has been linked to the provided DID.
 *
 * @param did The DID to use for the lookup.
 * @param account The account to use for the lookup.
 * @returns True if the DID and account is linked, false otherwise.
 */
export async function queryIsConnected(
  did: DidUri,
  account: Address
): Promise<boolean> {
  const api = ConfigService.get('api')
  if (isEthereumEnabled(api)) {
    // The following function returns something different than 0x00 if there is an entry for the provided key, 0x00 otherwise.
    return !(
      await api.query.didLookup.connectedAccounts.hash(
        encodeDid(did),
        encodeMultiAddress(account)
      )
    ).isEmpty
    // isEmpty returns true if there is no entry for the given key -> the function should return false.
  }
  return !(
    await api.query.didLookup.connectedAccounts.hash(encodeDid(did), account)
  ).isEmpty
}

/* ### EXTRINSICS ### */

/**
 * Signing (authorizing) this extrinsic with a full DID and submitting it with any Account
 * will link Account to full DID and remove any pre-existing links of Account.
 * Account must give permission by signing a Scale-encoded tuple consisting of the full DID address
 * and a block number representing the expiration block of the signature (after which it cannot be submitted anymore).
 * Account does not need to hold balance. The submitting account will pay and own the deposit for the link.
 *
 * @param account The account to link to the authorizing full DID.
 * @param signatureValidUntilBlock The link request will be rejected if submitted later than this block number.
 * @param signature Account's signature over `(DidAddress, BlockNumber).toU8a()`.
 * @param sigType The type of key/substrate account which produced the `signature`.
 * @returns An extrinsic that must be DID-authorized.
 */
export async function getAccountSignedAssociationExtrinsic(
  account: Address,
  signatureValidUntilBlock: AnyNumber,
  signature: Uint8Array | HexString,
  sigType: KeypairType
): Promise<Extrinsic> {
  const proof = { [sigType]: signature } as EncodedSignature

  const api = ConfigService.get('api')
  if (isEthereumEnabled(api)) {
    if (sigType === 'ethereum') {
      return api.tx.didLookup.associateAccount(
        { Ethereum: [account, signature] },
        signatureValidUntilBlock
      )
    }
    return api.tx.didLookup.associateAccount(
      { Dotsama: [account, proof] },
      signatureValidUntilBlock
    )
  }

  if (sigType === 'ethereum')
    throw new SDKErrors.CodecMismatchError(
      'Ethereum linking is not yet supported by this chain'
    )

  return api.tx.didLookup.associateAccount(
    account,
    signatureValidUntilBlock,
    proof
  )
}

/**
 * Allows the authorizing full DID to unilaterally remove its link to a given account.
 * This must be DID-authorized, but can be submitted by any account.
 *
 * @param linkedAccount An account linked to the full DID which should be unlinked.
 * @returns An Extrinsic that must be DID-authorized by the full DID linked to `linkedAccount`.
 */
export async function getLinkRemovalByDidExtrinsic(
  linkedAccount: Address
): Promise<Extrinsic> {
  const api = ConfigService.get('api')
  if (isEthereumEnabled(api)) {
    return api.tx.didLookup.removeAccountAssociation(
      encodeMultiAddress(linkedAccount)
    )
  }
  return api.tx.didLookup.removeAccountAssociation(linkedAccount)
}

/* ### HELPERS ### */

/**
 * Return the default sign callback, which uses the address argument to crete a signing closure for the given payload.
 *
 * @param keypair The keypair to sign the data with.
 * @returns The signature generating callback that uses the keyring to sign the input payload using the input address.
 */
export function makeLinkingSignCallback(
  keypair: KeyringPair
): LinkingSignCallback {
  return async function sign(payload: HexString): Promise<Uint8Array> {
    return keypair.sign(payload, { withType: false })
  }
}

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
 * Builds an extrinsic to link `account` to a `did` where the fees and deposit are covered by some third account.
 * This extrinsic must be authorized using the same full DID.
 * Note that in addition to the signing account and DID used here, the submitting account will also be able to dissolve the link via reclaiming its deposit!
 *
 * @param accountAddress Address of the account to be linked.
 * @param did Full DID to be linked.
 * @param sign The sign callback that generates the account signature over the encoded (DidAddress, BlockNumber) tuple.
 * @param nBlocksValid The link request will be rejected if submitted later than (current block number + nBlocksValid)?
 * @returns An Extrinsic that must be DID-authorized by the full DID used.
 */
export async function getAuthorizeLinkWithAccountExtrinsic(
  accountAddress: Address,
  did: DidUri,
  sign: LinkingSignCallback,
  nBlocksValid = 10
): Promise<Extrinsic> {
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
    .createType(`(${DidAddress}, ${BlockNumber})`, [encodeDid(did), validTill])
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

  return getAccountSignedAssociationExtrinsic(
    accountAddress,
    validTill,
    signature,
    type
  )
}

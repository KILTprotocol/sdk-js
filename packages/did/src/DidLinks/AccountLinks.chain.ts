/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeAddress, signatureVerify } from '@polkadot/util-crypto'
import type { TypeDef } from '@polkadot/types/types'
import type { KeypairType } from '@polkadot/util-crypto/types'
import type { ApiPromise } from '@polkadot/api'
import type { BN } from '@polkadot/util'
import type {
  Did,
  HexString,
  KeyringPair,
  KiltAddress,
} from '@kiltprotocol/types'

import {
  stringToU8a,
  U8A_WRAP_ETHEREUM,
  u8aConcatStrict,
  u8aToHex,
  u8aWrapBytes,
} from '@polkadot/util'
import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'

import type { EncodedSignature } from '../Did.chain.js'
import { toChain } from '../Did.chain.js'

/**
 *  A chain-agnostic address, which can be encoded using any network prefix.
 */
export type SubstrateAddress = KeyringPair['address']

export type EthereumAddress = HexString

export type Address = KiltAddress | SubstrateAddress | EthereumAddress

type EncodedMultiAddress =
  | { AccountId20: Uint8Array }
  | { AccountId32: Uint8Array }

/**
 * Detects whether the spec version indicates presence of Ethereum linking enabled pallet.
 *
 * @param api The api object.
 * @returns True if Ethereum linking is supported.
 */
function isEthereumEnabled(api: ApiPromise): boolean {
  return api.runtimeVersion.specVersion.gten(11000)
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

/* ### EXTRINSICS ### */

type LinkingInfo = [Address, unknown]
type AssociateAccountToChainResult = [
  (
    | {
        Polkadot: LinkingInfo
      }
    | {
        Ethereum: LinkingInfo
      }
  ),
  BN
]

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

async function getLinkingChallengeV1(
  did: Did,
  validUntil: BN
): Promise<Uint8Array> {
  const api = ConfigService.get('api')

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

  return api
    .createType(`(${DidAddress}, ${BlockNumber})`, [toChain(did), validUntil])
    .toU8a()
}

function getLinkingChallengeV2(did: Did, validUntil: BN): Uint8Array {
  return stringToU8a(
    `Publicly link the signing address to ${did} before block number ${validUntil}`
  )
}

/**
 * Generates the challenge that links a DID to an account.
 * The account has to sign the challenge, while the DID will sign the extrinsic that contains the challenge and will
 * link the account to the DID.
 *
 * @param did The DID that should be linked to an account.
 * @param validUntil Last blocknumber that this challenge is valid for.
 * @returns The encoded challenge.
 */
export async function getLinkingChallenge(
  did: Did,
  validUntil: BN
): Promise<Uint8Array> {
  const api = ConfigService.get('api')
  if (isEthereumEnabled(api)) {
    return getLinkingChallengeV2(did, validUntil)
  }
  return getLinkingChallengeV1(did, validUntil)
}

/**
 * Generates the arguments for the extrinsic that links an account to a DID.
 *
 * @param accountAddress Address of the account to be linked.
 * @param validUntil Last blocknumber that this challenge is valid for.
 * @param signature The signature for the linking challenge.
 * @param type The key type used to sign the challenge.
 * @returns The arguments for the call that links account and DID.
 */
export async function getLinkingArguments(
  accountAddress: Address,
  validUntil: BN,
  signature: Uint8Array,
  type: KeypairType
): Promise<AssociateAccountToChainResult> {
  const api = ConfigService.get('api')

  const proof = { [type]: signature } as EncodedSignature

  if (isEthereumEnabled(api)) {
    if (type === 'ethereum') {
      return [{ Ethereum: [accountAddress, signature] }, validUntil]
    }
    return [{ Polkadot: [accountAddress, proof] }, validUntil]
  }

  if (type === 'ethereum')
    throw new SDKErrors.CodecMismatchError(
      'Ethereum linking is not yet supported by this chain'
    )
  // Force type cast to enable the new blockchain types to accept the historic format
  return [
    accountAddress,
    validUntil,
    proof,
  ] as unknown as AssociateAccountToChainResult
}

/**
 * Identifies the strategy to wrap raw bytes for signing.
 */
export type WrappingStrategy = 'ethereum' | 'polkadot'

/**
 * Wraps the provided challenge according to the key type.
 *
 * Ethereum addresses will cause the challenge to be prefixed with
 * `\x19Ethereum Signed Message:\n` and the length of the message.
 *
 * For all other key types the message will be wrapped in `<Bytes>..</Bytes>`.
 *
 * @param type The key type that will sign the challenge.
 * @param challenge The challenge to proof ownership of both account and DID.
 * @returns The wrapped challenge.
 */
export function getWrappedChallenge(
  type: WrappingStrategy,
  challenge: Uint8Array
): Uint8Array {
  if (type === 'ethereum') {
    const length = stringToU8a(String(challenge.length))
    return u8aConcatStrict([U8A_WRAP_ETHEREUM, length, challenge])
  }
  return u8aWrapBytes(challenge)
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
  did: Did,
  sign: (encodedLinkingDetails: HexString) => Promise<Uint8Array>,
  nBlocksValid = 10
): Promise<AssociateAccountToChainResult> {
  const api = ConfigService.get('api')

  const blockNo = await api.query.system.number()
  const validTill = blockNo.addn(nBlocksValid)

  const challenge = await getLinkingChallenge(did, validTill)

  // ethereum addresses are 42 characters long since they are 20 bytes hex encoded strings
  // (they start with 0x, 2 characters per byte)
  const predictedType = accountAddress.length === 42 ? 'ethereum' : 'polkadot'
  const wrappedChallenge = u8aToHex(
    getWrappedChallenge(predictedType, challenge)
  )

  const { signature, type } = getUnprefixedSignature(
    wrappedChallenge,
    await sign(wrappedChallenge),
    accountAddress
  )

  return getLinkingArguments(accountAddress, validTill, signature, type)
}

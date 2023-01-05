/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeAddress, signatureVerify } from '@polkadot/util-crypto'
import type { AnyNumber, TypeDef } from '@polkadot/types/types'
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

import { SDKErrors } from '@kiltprotocol/utils'
import type { DidUri, KiltAddress } from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'

import { EncodedSignature } from '../Did.utils.js'
import { toChain } from '../Did.chain.js'

/// A chain-agnostic address, which can be encoded using any network prefix.
export type SubstrateAddress = KeyringPair['address']

export type EthereumAddress = HexString

export type Address = KiltAddress | SubstrateAddress | EthereumAddress

type EncodedMultiAddress =
  | { AccountId20: Uint8Array }
  | { AccountId32: Uint8Array }

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

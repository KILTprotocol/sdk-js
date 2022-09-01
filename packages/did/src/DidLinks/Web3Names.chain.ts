/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri, KiltAddress } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DecoderUtils, SDKErrors } from '@kiltprotocol/utils'

import type { ApiPromise } from '@polkadot/api'

import * as DidUtils from '../Did.utils.js'
import { encodeDid } from '../Did.chain.js'

/**
 * Web3Name is the type of a nickname for a DID.
 */
export type Web3Name = string

function checkWeb3NameInputConstraints(
  api: ApiPromise,
  web3Name: Web3Name
): void {
  const [minLength, maxLength] = [
    api.consts.web3Names.minNameLength.toNumber(),
    api.consts.web3Names.maxNameLength.toNumber(),
  ]

  if (web3Name.length < minLength) {
    throw new SDKErrors.Web3NameError(
      `The provided name "${web3Name}" is shorter than the minimum number of characters allowed, which is ${minLength}`
    )
  }
  if (web3Name.length > maxLength) {
    throw new SDKErrors.Web3NameError(
      `The provided name "${web3Name}" is longer than the maximum number of characters allowed, which is ${maxLength}`
    )
  }
}

/**
 * Retrieve the Web3Name for a specific DID uri.
 *
 * @param did DID of the web3name owner, i.e. 'did:kilt:4abc...'.
 * @returns The registered web3name for this DID if any.
 */
export async function queryWeb3NameForDid(
  did: DidUri
): Promise<Web3Name | null> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.web3Names.names(encodeDid(did))
  DecoderUtils.assertCodecIsType(encoded, ['Option<Bytes>'])
  return encoded.isSome ? encoded.unwrap().toUtf8() : null
}

/**
 * Retrieve the DID uri for a specific web3 name.
 *
 * @param name Web3 name that should be looked up.
 * @returns The full DID uri, i.e. 'did:kilt:4abc...', if any.
 */
export async function queryDidForWeb3Name(
  name: Web3Name
): Promise<DidUri | null> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.web3Names.owner(name)
  DecoderUtils.assertCodecIsType(encoded, [
    'Option<PalletWeb3NamesWeb3NameWeb3NameOwnership>',
  ])

  const address = encoded.isSome
    ? (encoded.unwrap().owner.toString() as KiltAddress)
    : null
  if (address === null) {
    return null
  }
  return DidUtils.getFullDidUri(address)
}

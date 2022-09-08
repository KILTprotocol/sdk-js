/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { BN } from '@polkadot/util'

import type {
  SubmittableExtrinsic,
  DidUri,
  KiltAddress,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'

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
 * Returns an extrinsic to claim a new web3name.
 *
 * @param name Web3Name that should be claimed.
 * The name must only contain ASCII characters and have a length in the inclusive range [3, 32].
 * @returns The SubmittableExtrinsic for the `claim` call.
 */
export async function getClaimTx(
  name: Web3Name
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  checkWeb3NameInputConstraints(api, name)
  return api.tx.web3Names.claim(name)
}

/**
 * Returns an extrinsic to release a web3name by its owner.
 *
 * @returns The SubmittableExtrinsic for the `releaseByOwner` call.
 */
export async function getReleaseByOwnerTx(): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  return api.tx.web3Names.releaseByOwner()
}

/**
 * Returns an extrinsic to release a web3name by the account that owns the deposit.
 *
 * @param name Web3Name that should be released.
 * The name must only contain ASCII characters and have a length in the inclusive range [3, 32].
 * @returns The SubmittableExtrinsic for the `reclaimDeposit` call.
 */
export async function getReclaimDepositTx(
  name: Web3Name
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  checkWeb3NameInputConstraints(api, name)
  return api.tx.web3Names.reclaimDeposit(name)
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
  const api = ConfigService.get('api')
  const encoded = await api.query.web3Names.names(encodeDid(did))
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
  const api = ConfigService.get('api')
  const encoded = await api.query.web3Names.owner(name)

  const address = encoded.isSome
    ? (encoded.unwrap().owner.toString() as KiltAddress)
    : null
  if (address === null) {
    return null
  }
  return DidUtils.getFullDidUri(address)
}

/**
 * Retrieves the deposit amount to claim a web3 name as currently stored in the runtime.
 *
 * @returns The deposit amount. The value is indicated in femto KILTs.
 */
export async function queryDepositAmount(): Promise<BN> {
  const api = ConfigService.get('api')
  return api.consts.web3Names.deposit.toBn()
}

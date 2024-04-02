/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encodeAddress } from '@polkadot/keyring'
import type { Option, Vec } from '@polkadot/types'
import type { Codec } from '@polkadot/types/types'
import { ethereumEncode } from '@polkadot/util-crypto'

import type {
  DidServiceEndpointsDidEndpoint,
  PalletDidLookupLinkableAccountLinkableAccountId,
  RawDidLinkedInfo,
} from '@kiltprotocol/augment-api'
import type {
  Did,
  DidDocument,
  DidUrl,
  KiltAddress,
  Service,
  UriFragment,
  VerificationMethod,
} from '@kiltprotocol/types'
import { ss58Format } from '@kiltprotocol/utils'

import { fromChain, publicKeyFromChain, serviceFromChain } from './Did.chain.js'
import { didKeyToVerificationMethod } from './Did.utils.js'
import type {
  Address,
  SubstrateAddress,
} from './DidLinks/AccountLinks.chain.js'

function servicesFromChain(
  encoded: DidServiceEndpointsDidEndpoint[],
  did?: Did
): Array<Service<UriFragment | DidUrl>> {
  return encoded.map((encodedValue) => {
    const service = serviceFromChain(encodedValue)
    return { ...service, id: `${did ?? ''}${service.id}` }
  })
}

function isLinkableAccountId(
  arg: Codec
): arg is PalletDidLookupLinkableAccountLinkableAccountId {
  return 'isAccountId32' in arg && 'isAccountId20' in arg
}

function accountFromChain(
  account: Codec,
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

function connectedAccountsFromChain(
  encoded: Vec<Codec>,
  networkPrefix = ss58Format
): Array<KiltAddress | SubstrateAddress> {
  return encoded.map<string>((account) =>
    accountFromChain(account, networkPrefix)
  )
}

export interface LinkedDidInfo<IdType extends DidUrl | UriFragment> {
  document: DidDocument<IdType>
  accounts: Address[]
}

export function linkedInfoFromChain(
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix?: number,
  relativeURLs?: false
): LinkedDidInfo<DidUrl>
export function linkedInfoFromChain(
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix: number | undefined,
  relativeURLs: true
): LinkedDidInfo<UriFragment>
export function linkedInfoFromChain(
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix: number | undefined,
  relativeURLs?: boolean
): LinkedDidInfo<DidUrl | UriFragment>

/**
 * Decodes accounts, DID, and web3name linked to the provided account.
 *
 * @param encoded The data returned by `api.call.did.queryByAccount()`, `api.call.did.query()`, and `api.call.did.queryByWeb3Name()`.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @param relativeURLs
 * @returns The accounts, DID, and web3name.
 */
export function linkedInfoFromChain(
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix = ss58Format,
  relativeURLs = false
): LinkedDidInfo<DidUrl | UriFragment> {
  const { identifier, accounts, w3n, serviceEndpoints, details } =
    encoded.unwrap()

  const {
    publicKeys,
    authenticationKey,
    attestationKey,
    delegationKey,
    keyAgreementKeys,
  } = details

  const did = fromChain(identifier)
  const idPrefix = relativeURLs === true ? `#` : (`${did}#` as const)
  function formatKeyId(keyId: Codec): DidUrl | UriFragment {
    return `${idPrefix}${keyId.toHex()}`
  }

  const verificationMethod: Array<VerificationMethod<DidUrl | UriFragment>> = [
    ...publicKeys.entries(),
  ].map(([keyId, keyDetails]) => {
    const { publicKey, type } = publicKeyFromChain(keyId, keyDetails)
    return didKeyToVerificationMethod(did, formatKeyId(keyId), {
      keyType: type,
      publicKey,
    })
  })

  const document: DidDocument<DidUrl | UriFragment> = {
    id: fromChain(identifier),
    verificationMethod,
    authentication: [formatKeyId(authenticationKey)],
  }
  if (attestationKey.isSome) {
    document.assertionMethod = [formatKeyId(attestationKey)]
  }
  if (delegationKey.isSome) {
    document.capabilityDelegation = [formatKeyId(delegationKey)]
  }
  if (!keyAgreementKeys.isEmpty) {
    document.keyAgreement = [...keyAgreementKeys.values()].map(formatKeyId)
  }

  const services = servicesFromChain(
    serviceEndpoints,
    relativeURLs === true ? undefined : did
  )
  if (services.length > 0) {
    document.service = services
  }

  if (w3n.isSome) {
    document.alsoKnownAs = [`w3n:${w3n.unwrap().toHuman()}`]
  }
  const linkedAccounts = connectedAccountsFromChain(accounts, networkPrefix)

  return {
    document,
    accounts: linkedAccounts,
  }
}

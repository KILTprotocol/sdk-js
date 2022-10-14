/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Enum, Option, Text, U8aFixed, Vec } from '@polkadot/types'
import type { Codec } from '@polkadot/types/types'
import type { AccountId32, Hash } from '@polkadot/types/interfaces'
import type {
  RawDidLinkedInfo,
  KiltSupportDeposit,
  RawDidDetails,
  DidDidDetailsDidPublicKeyDetails,
  RawServiceEndpoints,
} from '@kiltprotocol/augment-api'
import type {
  Deposit,
  DidDocument,
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  KiltAddress,
  UriFragment,
} from '@kiltprotocol/types'

import { encodeAddress } from '@polkadot/keyring'
import { ethereumEncode } from '@polkadot/util-crypto'
import { BN } from '@polkadot/util'
import { Crypto, ss58Format } from '@kiltprotocol/utils'

import { Address, SubstrateAddress } from './DidLinks/AccountLinks.chain.js'
import { getFullDidUri } from './Did.utils.js'

function fromChain(encoded: AccountId32): DidUri {
  return getFullDidUri(Crypto.encodeAddress(encoded, ss58Format))
}

type RpcDocument = Pick<
  DidDocument,
  'authentication' | 'assertionMethod' | 'capabilityDelegation' | 'keyAgreement'
> & {
  lastTxCounter: BN
  deposit: Deposit
}

function depositFromChain(deposit: KiltSupportDeposit): Deposit {
  return {
    owner: Crypto.encodeAddress(deposit.owner, ss58Format),
    amount: deposit.amount.toBn(),
  }
}

function didPublicKeyDetailsFromChain(
  keyId: Hash,
  keyDetails: DidDidDetailsDidPublicKeyDetails
): DidKey {
  const key = keyDetails.key.isPublicEncryptionKey
    ? keyDetails.key.asPublicEncryptionKey
    : keyDetails.key.asPublicVerificationKey
  return {
    id: `#${keyId.toHex()}`,
    type: key.type.toLowerCase() as DidKey['type'],
    publicKey: key.value.toU8a(),
  }
}

function resourceIdToChain(id: UriFragment): string {
  return id.replace(/^#/, '')
}

function documentFromChain(encoded: RawDidDetails): RpcDocument {
  const {
    publicKeys,
    authenticationKey,
    attestationKey,
    delegationKey,
    keyAgreementKeys,
    lastTxCounter,
    deposit,
  } = encoded

  const keys: Record<string, DidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) =>
      didPublicKeyDetailsFromChain(keyId, keyDetails)
    )
    .reduce((res, key) => {
      res[resourceIdToChain(key.id)] = key
      return res
    }, {})

  const authentication = keys[authenticationKey.toHex()] as DidVerificationKey

  const didRecord: RpcDocument = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn(),
    deposit: depositFromChain(deposit),
  }

  if (attestationKey.isSome) {
    const key = keys[attestationKey.unwrap().toHex()] as DidVerificationKey
    didRecord.assertionMethod = [key]
  }
  if (delegationKey.isSome) {
    const key = keys[delegationKey.unwrap().toHex()] as DidVerificationKey
    didRecord.capabilityDelegation = [key]
  }

  const keyAgreementKeyIds = [...keyAgreementKeys.values()].map((keyId) =>
    keyId.toHex()
  )
  if (keyAgreementKeyIds.length > 0) {
    didRecord.keyAgreement = keyAgreementKeyIds.map(
      (id) => keys[id] as DidEncryptionKey
    )
  }

  return didRecord
}

function serviceFromChain(encoded: RawServiceEndpoints): DidServiceEndpoint {
  const { id, serviceTypes, urls } = encoded
  return {
    id: `#${id.toHuman()}`,
    type: serviceTypes.map((type) => type.toHuman()),
    serviceEndpoint: urls.map((url) => url.toHuman()),
  }
}

function servicesFromChain(
  encoded: RawServiceEndpoints[]
): DidServiceEndpoint[] {
  return encoded.map((encodedValue) => serviceFromChain(encodedValue))
}

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

/**
 * Web3Name is the type of nickname for a DID.
 */
export type Web3Name = string

export interface DidInfo {
  document: DidDocument
  web3Name?: Web3Name
  accounts: Address[]
}

/**
 * Decodes accounts, DID, and web3name linked to the provided account.
 *
 * @param encoded The data returned by `api.call.didApi.queryDidByAccountId()`, `api.call.didApi.queryDid()`, and `api.call.didApi.queryByW3n()`.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @returns The accounts, DID, and web3name.
 */
export function linkedInfoFromChain(
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix = ss58Format
): DidInfo {
  const { identifier, accounts, w3n, serviceEndpoints, details } =
    encoded.unwrap()

  const didRec = documentFromChain(details)
  const did: DidDocument = {
    uri: fromChain(identifier),
    authentication: didRec.authentication,
    assertionMethod: didRec.assertionMethod,
    capabilityDelegation: didRec.capabilityDelegation,
    keyAgreement: didRec.keyAgreement,
  }

  const service = servicesFromChain(serviceEndpoints)
  if (service.length > 0) {
    did.service = service
  }

  const web3Name = w3n.isNone ? undefined : w3n.unwrap().toHuman()
  const linkedAccounts = connectedAccountsFromChain(accounts, networkPrefix)

  return {
    document: did,
    web3Name,
    accounts: linkedAccounts,
  }
}

/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option, Vec } from '@polkadot/types'
import type { Codec } from '@polkadot/types/types'
import type {
  RawDidLinkedInfo,
  DidDidDetails,
  DidServiceEndpointsDidEndpoint,
  PalletDidLookupLinkableAccountLinkableAccountId,
} from '@kiltprotocol/augment-api'
import type { KiltAddress, DidDocumentV2 } from '@kiltprotocol/types'

import { ss58Format } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/keyring'
import { ethereumEncode } from '@polkadot/util-crypto'
import { Address, SubstrateAddress } from './DidLinks/AccountLinks.chain.js'
import { didKeyToVerificationMethod } from './Did2.utils.js'
import {
  ChainDidDetails,
  ChainDidEncryptionKey,
  ChainDidKey,
  ChainDidVerificationKey,
  depositFromChain,
  fragmentIdToChain,
  fromChain,
  publicKeyFromChain,
} from './Did2.chain.js'
import { addKeypairAsVerificationMethod } from './DidDetailsv2/DidDetailsV2.js'

function documentFromChain(
  encoded: DidDidDetails
): Omit<ChainDidDetails, 'service'> {
  const {
    publicKeys,
    authenticationKey,
    attestationKey,
    delegationKey,
    keyAgreementKeys,
    lastTxCounter,
    deposit,
  } = encoded

  const keys: Record<string, ChainDidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) => publicKeyFromChain(keyId, keyDetails))
    .reduce((res, key) => {
      res[fragmentIdToChain(key.id)] = key
      return res
    }, {})

  const authentication = keys[
    authenticationKey.toHex()
  ] as ChainDidVerificationKey

  const didRecord: ChainDidDetails = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn(),
    deposit: depositFromChain(deposit),
  }
  if (attestationKey.isSome) {
    const key = keys[attestationKey.unwrap().toHex()] as ChainDidVerificationKey
    didRecord.assertionMethod = [key]
  }
  if (delegationKey.isSome) {
    const key = keys[delegationKey.unwrap().toHex()] as ChainDidVerificationKey
    didRecord.capabilityDelegation = [key]
  }

  const keyAgreementKeyIds = [...keyAgreementKeys.values()].map((keyId) =>
    keyId.toHex()
  )
  if (keyAgreementKeyIds.length > 0) {
    didRecord.keyAgreement = keyAgreementKeyIds.map(
      (id) => keys[id] as ChainDidEncryptionKey
    )
  }

  return didRecord
}

function serviceFromChain(
  encoded: DidServiceEndpointsDidEndpoint
): DidDocumentV2.Service {
  const { id, serviceTypes, urls } = encoded
  return {
    id: `#${id.toUtf8()}`,
    type: serviceTypes.map((type) => type.toUtf8()),
    serviceEndpoint: urls.map((url) => url.toUtf8()),
  }
}

function servicesFromChain(
  encoded: DidServiceEndpointsDidEndpoint[]
): DidDocumentV2.Service[] {
  return encoded.map((encodedValue) => serviceFromChain(encodedValue))
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

export interface LinkedDidInfo {
  document: DidDocumentV2.DidDocument
  accounts: Address[]
}

/**
 * Decodes accounts, DID, and web3name linked to the provided account.
 *
 * @param encoded The data returned by `api.call.did.queryByAccount()`, `api.call.did.query()`, and `api.call.did.queryByWeb3Name()`.
 * @param networkPrefix The optional network prefix to use to encode the returned addresses. Defaults to KILT prefix (38). Use `42` for the chain-agnostic wildcard Substrate prefix.
 * @returns The accounts, DID, and web3name.
 */
export function linkedInfoFromChain(
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix = ss58Format
): LinkedDidInfo {
  const { identifier, accounts, w3n, serviceEndpoints, details } =
    encoded.unwrap()

  const {
    authentication,
    keyAgreement,
    capabilityDelegation,
    assertionMethod,
  } = documentFromChain(details)
  const did: DidDocumentV2.DidDocument = {
    id: fromChain(identifier),
    authentication: [authentication[0].id],
    verificationMethod: [
      didKeyToVerificationMethod(fromChain(identifier), authentication[0].id, {
        keyType: authentication[0].type,
        publicKey: authentication[0].publicKey,
      }),
    ],
  }

  if (keyAgreement !== undefined && keyAgreement.length > 0) {
    keyAgreement.forEach(({ id, publicKey, type }) => {
      addKeypairAsVerificationMethod(
        did,
        { id, publicKey, type },
        'keyAgreement'
      )
    })
  }

  if (assertionMethod !== undefined) {
    const { id, type, publicKey } = assertionMethod[0]
    addKeypairAsVerificationMethod(
      did,
      { id, publicKey, type },
      'assertionMethod'
    )
  }

  if (capabilityDelegation !== undefined) {
    const { id, type, publicKey } = capabilityDelegation[0]
    addKeypairAsVerificationMethod(
      did,
      { id, publicKey, type },
      'capabilityDelegation'
    )
  }

  const services = servicesFromChain(serviceEndpoints)
  if (services.length > 0) {
    did.service = services
  }

  const web3Name = w3n.isNone ? undefined : w3n.unwrap().toHuman()
  if (web3Name !== undefined) {
    did.alsoKnownAs = [`w3n:${web3Name}`]
  }
  const linkedAccounts = connectedAccountsFromChain(accounts, networkPrefix)

  return {
    document: did,
    accounts: linkedAccounts,
  }
}

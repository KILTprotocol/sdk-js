/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Extrinsic } from '@polkadot/types/interfaces'
import { TypeRegistry } from '@polkadot/types'
import type {
  ApiOrMetadata,
  CallMeta,
  IDidDetails,
  KeyDetails,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { DidDetails, KeyRoles } from './DidDetails'

interface MethodMapping<V extends string> {
  default: V
  [section: string]: V
}

type SectionMapping<V extends string> = Record<string, MethodMapping<V>>

// Call::Attestation(_) => Some(did::DidVerificationKeyRelationship::AssertionMethod),
// Call::Ctype(_) => Some(did::DidVerificationKeyRelationship::AssertionMethod),
// Call::Delegation(_) => Some(did::DidVerificationKeyRelationship::CapabilityDelegation),
const mapping: SectionMapping<
  VerificationKeyRelationship | 'paymentAccount'
> = {
  attestation: { default: 'assertionMethod' },
  ctype: { default: 'assertionMethod' },
  delegation: { default: 'capabilityDelegation' },
  did: {
    default: 'paymentAccount',
    update: 'authentication',
    delete: 'authentication',
  },
  default: { default: 'paymentAccount' },
}

// internally maps call.section & call.method to a key relationship - or indicates a payment account (substrate key holding tokens) must be used
export function mapCallToKeyRelationship(
  call: CallMeta
): VerificationKeyRelationship | 'paymentAccount' {
  const { section, method } = call
  const methodData = mapping[section] || mapping.default
  return methodData[method] || methodData.default
}

function isApiPromise(api: unknown): api is ApiPromise {
  return (api as ApiPromise).type === 'promise'
}

export function extrinsicToCallMeta(
  apiOrMetadata: ApiOrMetadata,
  extrinsic: Extrinsic
): CallMeta {
  if (isApiPromise(apiOrMetadata)) {
    return apiOrMetadata.findCall(extrinsic.callIndex)
  }
  const registry = new TypeRegistry()
  registry.setMetadata(apiOrMetadata)
  return registry.findMetaCall(extrinsic.callIndex)
}

// to recover Call info from an Extrinsic/SubmittableExtrinsic, we need the chain's metadata, which we can also get from the api object
export function mapExtrinsicToKeyRelationship(
  apiOrMetadata: ApiOrMetadata,
  extrinsic: Extrinsic
): VerificationKeyRelationship | 'paymentAccount' {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return mapCallToKeyRelationship(callMeta)
}

// the above can be used to query key info from the did info object
export function getKeysForCall(
  didDetails: IDidDetails,
  call: CallMeta
): KeyDetails[] {
  const keyRelationship = mapCallToKeyRelationship(call)
  if (keyRelationship === 'paymentAccount') return []
  return didDetails.getKeys(keyRelationship)
}

export function getKeysForExtrinsic(
  apiOrMetadata: ApiOrMetadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): KeyDetails[] {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return getKeysForCall(didDetails, callMeta)
}

export function getKeyIdsForCall(
  didDetails: IDidDetails,
  call: CallMeta
): Array<KeyDetails['id']> {
  return getKeysForCall(didDetails, call).map((key) => key.id)
}

export function getKeyIdsForExtrinsic(
  apiOrMetadata: ApiOrMetadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): Array<KeyDetails['id']> {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return getKeyIdsForCall(didDetails, callMeta)
}

export function newDidfromKeyRecords(keys: {
  authentication: KeyDetails
  keyAgreement?: KeyDetails
  assertionMethod?: KeyDetails
  capabilityDelegation?: KeyDetails
  capabilityInvocation?: KeyDetails
}): DidDetails {
  const did = keys.authentication.controller
  const allKeys: KeyDetails[] = []
  const keyRelationships: KeyRoles = {}
  Object.entries(keys).forEach(([thisRole, thisKey]) => {
    if (thisKey) {
      keyRelationships[thisRole] = [thisKey.id]
      allKeys.push(thisKey)
    }
  })
  return new DidDetails({
    did,
    keys: allKeys,
    keyRelationships,
    lastTxIndex: BigInt(0),
  })
}

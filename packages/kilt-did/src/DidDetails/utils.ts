/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Metadata } from '@polkadot/metadata'
import type { Extrinsic } from '@polkadot/types/interfaces'
import { TypeRegistry } from '@polkadot/types'
import type { KeyDetails } from '../types'
import type {
  CallMeta,
  VerificationKeyRelationship,
  IDidDetails,
} from './types'

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
  did: { default: 'paymentAccount' },
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

// to recover Call info from an Extrinsic/SubmittableExtrinsic, we need the chain's metadata, which we can also get from the api object
export function mapExtrinsicToKeyRelationship(
  apiOrMetadata: ApiPromise | Metadata,
  extrinsic: Extrinsic
): VerificationKeyRelationship | 'paymentAccount' {
  let callMeta: CallMeta
  if (isApiPromise(apiOrMetadata)) {
    callMeta = apiOrMetadata.findCall(extrinsic.callIndex)
  } else {
    const registry = new TypeRegistry()
    registry.setMetadata(apiOrMetadata)
    callMeta = registry.findMetaCall(extrinsic.callIndex)
  }
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

export function getKeyIdsForCall(
  didDetails: IDidDetails,
  call: CallMeta
): Array<KeyDetails['id']> {
  return getKeysForCall(didDetails, call).map((key) => key.id)
}

export function getKeysForExtrinsic(
  apiOrMetadata: ApiPromise | Metadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): KeyDetails[] {
  const keyRelationship = mapExtrinsicToKeyRelationship(
    apiOrMetadata,
    extrinsic
  )
  if (keyRelationship === 'paymentAccount') return []
  return didDetails.getKeys(keyRelationship)
}

export function getKeyIdsForExtrinsic(
  apiOrMetadata: ApiPromise | Metadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): Array<KeyDetails['id']> {
  return getKeysForExtrinsic(apiOrMetadata, didDetails, extrinsic).map(
    (key) => key.id
  )
}

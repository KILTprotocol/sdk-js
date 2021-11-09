/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Extrinsic } from '@polkadot/types/interfaces'
import { TypeRegistry } from '@polkadot/types'
import { BN } from '@polkadot/util'
import type {
  ApiOrMetadata,
  CallMeta,
  IDidDetails,
  IDidKeyDetails,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import type { MapKeyToRelationship } from '../types'
import { FullDidDetails } from './FullDidDetails'

interface MethodMapping<V extends string> {
  default: V
  [section: string]: V
}

type SectionMapping<V extends string> = Record<string, MethodMapping<V>>

// Call::Attestation(_) => Some(did::DidVerificationKeyRelationship::AssertionMethod),
// Call::Ctype(_) => Some(did::DidVerificationKeyRelationship::AssertionMethod),
// Call::Delegation(_) => Some(did::DidVerificationKeyRelationship::CapabilityDelegation),
const mapping: SectionMapping<VerificationKeyRelationship | 'paymentAccount'> =
  {
    attestation: { default: KeyRelationship.assertionMethod },
    ctype: { default: KeyRelationship.assertionMethod },
    delegation: { default: KeyRelationship.capabilityDelegation },
    did: {
      default: KeyRelationship.authentication,
      create: 'paymentAccount',
      submitDidCall: 'paymentAccount',
      reclaimDeposit: 'paymentAccount',
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
): IDidKeyDetails[] {
  const keyRelationship = mapCallToKeyRelationship(call)
  if (keyRelationship === 'paymentAccount') return []
  return didDetails.getKeys(keyRelationship)
}

export function getKeysForExtrinsic(
  apiOrMetadata: ApiOrMetadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): IDidKeyDetails[] {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return getKeysForCall(didDetails, callMeta)
}

export function getKeyIdsForCall(
  didDetails: IDidDetails,
  call: CallMeta
): Array<IDidKeyDetails['id']> {
  return getKeysForCall(didDetails, call).map((key) => key.id)
}

export function getKeyIdsForExtrinsic(
  apiOrMetadata: ApiOrMetadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): Array<IDidKeyDetails['id']> {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return getKeyIdsForCall(didDetails, callMeta)
}

export function newFullDidDetailsfromKeys(
  keys: Partial<Record<KeyRelationship, IDidKeyDetails>> & {
    [KeyRelationship.authentication]: IDidKeyDetails
  }
): FullDidDetails {
  const did = keys[KeyRelationship.authentication].controller
  const allKeys: IDidKeyDetails[] = []
  const keyRelationships: MapKeyToRelationship = {}
  Object.entries(keys).forEach(([thisRole, thisKey]) => {
    if (thisKey) {
      keyRelationships[thisRole] = [thisKey.id]
      allKeys.push(thisKey)
    }
  })
  return new FullDidDetails({
    did,
    keys: allKeys,
    keyRelationships,
    lastTxIndex: new BN(0),
  })
}

/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { base58Decode } from '@polkadot/util-crypto'

import { KILT_ATTESTER_DELEGATION_V1_TYPE } from './constants.js'
import type { KiltAttesterDelegationV1, VerifiableCredential } from './types.js'

export type ExpandedContents<
  T extends VerifiableCredential['credentialSubject']
> = {
  [Key in keyof T as `${T['@context']['@vocab']}`]: T[Key]
} & { '@id': T['id'] }

/**
 * Transforms credentialSubject to an expanded JSON-LD representation.
 *
 * @param credentialSubject The object containing claims about the credentialSubject.
 * @returns The `credentialSubject` where each key is either `@id` or the result of concatenating the `@vocab` with the original key.
 */
export function jsonLdExpandCredentialSubject<
  T extends VerifiableCredential['credentialSubject']
>(credentialSubject: T): ExpandedContents<T> {
  const expandedContents = {}
  const vocabulary = credentialSubject['@context']['@vocab']
  Object.entries(credentialSubject).forEach(([key, value]) => {
    if (key === '@context') return
    if (key === 'id' || key === 'type') {
      expandedContents[`@${key}`] = value
    } else if (key.startsWith(vocabulary) || key.startsWith('@')) {
      expandedContents[key] = value
    } else {
      expandedContents[vocabulary + key] = value
    }
  })
  return expandedContents as ExpandedContents<T>
}

const delegationIdPattern =
  /^kilt:delegation\/(?<delegationId>[-a-zA-Z0-9]{1,78})$/

/**
 * Extract the local (i.e., unique within a KILT blockchain network) delegation node identifier from a [[KiltAttesterDelegationV1]] object.
 *
 * @param delegation A [[KiltAttesterDelegationV1]] object.
 * @returns A delegation id.
 */
export function delegationIdFromAttesterDelegation(
  delegation: KiltAttesterDelegationV1
): Uint8Array {
  if (delegation.type !== KILT_ATTESTER_DELEGATION_V1_TYPE) {
    throw new Error(`type must be ${KILT_ATTESTER_DELEGATION_V1_TYPE}`)
  }
  const match = delegationIdPattern.exec(delegation.id)
  if (!match || !match.groups?.delegationId)
    throw new Error(
      `not a valid id for type ${KILT_ATTESTER_DELEGATION_V1_TYPE}: ${delegation.id}`
    )
  return base58Decode(match.groups.delegationId)
}

/**
 * Extract the local (i.e., unique within a KILT blockchain network) delegation node identifier from a credential's federatedTrustModel entries.
 *
 * @param credential A [[KiltCredentialV1]] type VerifiableCredential.
 * @returns A delegation id or `null` if there is no [[KiltAttesterDelegationV1]] type entry in the federatedTrustModel.
 */
export function getDelegationNodeIdForCredential(
  credential: Pick<VerifiableCredential, 'federatedTrustModel'>
): Uint8Array | null {
  const delegation = credential.federatedTrustModel?.find(
    (i): i is KiltAttesterDelegationV1 =>
      i.type === KILT_ATTESTER_DELEGATION_V1_TYPE
  )
  return delegation ? delegationIdFromAttesterDelegation(delegation) : null
}

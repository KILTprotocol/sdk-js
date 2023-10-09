/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'
import { hexToU8a } from '@polkadot/util'

import type { HexString } from '@kiltprotocol/types'
import { Caip19, Caip2, SDKErrors } from '@kiltprotocol/utils'

import type { KiltAttesterDelegationV1, KiltCredentialV1 } from './types.js'

export const spiritnetGenesisHash = hexToU8a(
  '0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21'
)
export const KILT_ATTESTER_LEGITIMATION_V1_TYPE = 'KiltAttesterLegitimationV1'

export const KILT_ATTESTER_DELEGATION_V1_TYPE = 'KiltAttesterDelegationV1'

export type ExpandedContents<T extends KiltCredentialV1['credentialSubject']> =
  {
    [Key in keyof T as `${T['@context']['@vocab']}`]: T[Key]
  } & { '@id': T['id'] }

/**
 * Transforms credentialSubject to an expanded JSON-LD representation.
 *
 * @param credentialSubject The object containing claims about the credentialSubject.
 * @returns The `credentialSubject` where each key is either `@id` or the result of concatenating the `@vocab` with the original key.
 * @private
 */
export function jsonLdExpandCredentialSubject<
  T extends KiltCredentialV1['credentialSubject']
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
 * @private
 */
export function delegationIdFromAttesterDelegation(
  delegation: KiltAttesterDelegationV1
): Uint8Array {
  if (delegation.type !== KILT_ATTESTER_DELEGATION_V1_TYPE) {
    throw new TypeError(
      `The value of type must be ${KILT_ATTESTER_DELEGATION_V1_TYPE}`
    )
  }
  const match = delegationIdPattern.exec(delegation.id)
  if (!match || !match.groups?.delegationId)
    throw new SDKErrors.CredentialMalformedError(
      `Not a valid id for type ${KILT_ATTESTER_DELEGATION_V1_TYPE}: ${delegation.id}`
    )
  return base58Decode(match.groups.delegationId)
}

/**
 * Extract the local (i.e., unique within a KILT blockchain network) delegation node identifier from a credential's federatedTrustModel entries.
 *
 * @param credential A [[KiltCredentialV1]] type VerifiableCredential.
 * @returns A delegation id or `null` if there is no [[KiltAttesterDelegationV1]] type entry in the federatedTrustModel.
 * @private
 */
export function getDelegationNodeIdForCredential(
  credential: Pick<KiltCredentialV1, 'federatedTrustModel'>
): Uint8Array | null {
  const delegation = credential.federatedTrustModel?.find(
    (i): i is KiltAttesterDelegationV1 =>
      i.type === KILT_ATTESTER_DELEGATION_V1_TYPE
  )
  return delegation ? delegationIdFromAttesterDelegation(delegation) : null
}

/**
 * Makes sure that we are connected to the right blockchain network, against which the credential may be verified.
 * Throws if that is not the case.
 *
 * @param api The api instance wrapping a connection to a blockchain network against which the credential is to be verified.
 * @param credential The verifiable credential to be verified.
 * @param credential.credentialStatus The credential's status update method containing the identifier of the expected network.
 * @returns The result of parsing the CAIP-19 identifier pointing to the attestation record by which the credential has been anchored to a blockchain network.
 * @private
 */
export function assertMatchingConnection(
  api: ApiPromise,
  { credentialStatus }: Pick<KiltCredentialV1, 'credentialStatus'>
): ReturnType<typeof Caip19.parse> {
  const apiChainId = Caip2.chainIdFromGenesis(api.genesisHash)
  const parsed = Caip19.parse(credentialStatus.id)
  if (apiChainId !== parsed.chainId) {
    throw new Error(
      `api must be connected to network ${parsed.chainId} to verify this credential`
    )
  }
  return parsed
}

export const KILT_CREDENTIAL_IRI_PREFIX = 'kilt:credential:'

/**
 * Extracts the credential root hash from a KILT VC's id.
 *
 * @param credentialId The IRI that serves as the credential id on KILT VCs.
 * @returns The credential root hash as a Uint8Array.
 */
export function credentialIdToRootHash(
  credentialId: KiltCredentialV1['id']
): Uint8Array {
  const base58String = credentialId.startsWith(KILT_CREDENTIAL_IRI_PREFIX)
    ? credentialId.substring(KILT_CREDENTIAL_IRI_PREFIX.length)
    : credentialId
  try {
    return base58Decode(base58String, false)
  } catch (cause) {
    throw new SDKErrors.CredentialMalformedError(
      'Credential id is not a valid identifier (could not extract base58 encoded string)',
      { cause }
    )
  }
}

/**
 * Transforms the credential root hash to an IRI that functions as the VC's id.
 *
 * @param rootHash Credential root hash as a Uint8Array or HexString.
 * @returns An IRI composed by prefixing the root hash with the [[KILT_CREDENTIAL_IRI_PREFIX]].
 */
export function credentialIdFromRootHash(
  rootHash: Uint8Array | HexString
): KiltCredentialV1['id'] {
  const bytes = typeof rootHash === 'string' ? hexToU8a(rootHash) : rootHash
  return `${KILT_CREDENTIAL_IRI_PREFIX}${base58Encode(bytes, false)}`
}

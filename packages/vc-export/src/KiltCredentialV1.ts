/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { hexToU8a, u8aToHex } from '@polkadot/util'
import { Claim, CType } from '@kiltprotocol/core'
import type {
  ICType,
  ICredential,
  DidUri,
  Caip2ChainId,
} from '@kiltprotocol/types'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'
import {
  DEFAULT_CREDENTIAL_CONTEXTS,
  DEFAULT_CREDENTIAL_TYPES,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
  KILT_REVOCATION_STATUS_V1_TYPE,
} from './constants.js'
import type {
  JsonSchemaValidator2018,
  KiltAttesterDelegationV1,
  KiltRevocationStatusV1,
  VerifiableCredential,
} from './types.js'

/**
 * Extracts the credential root hash from a KILT VC's id.
 *
 * @param credentialId The IRI that serves as the credential id on KILT VCs.
 * @returns The credential root hash as a Uint8Array.
 */
export function credentialIdToRootHash(
  credentialId: VerifiableCredential['id']
): Uint8Array {
  const base58String = credentialId.startsWith(KILT_CREDENTIAL_IRI_PREFIX)
    ? credentialId.substring(KILT_CREDENTIAL_IRI_PREFIX.length)
    : credentialId
  try {
    return base58Decode(base58String, false)
  } catch (cause) {
    throw new Error(
      'Credential id is not a valid identifier (could not extract base58 encoded string)',
      { cause }
    )
  }
}

/**
 * Transforms the credential root hash to an IRI that functions as the VC's id.
 *
 * @param rootHash Credential root hash as a Uint8Array.
 * @returns An IRI composed by prefixing the root hash with the [[KILT_CREDENTIAL_IRI_PREFIX]].
 */
export function credentialIdFromRootHash(
  rootHash: Uint8Array
): VerifiableCredential['id'] {
  return `${KILT_CREDENTIAL_IRI_PREFIX}${base58Encode(rootHash, false)}`
}

/**
 * Transforms an [[ICredential]] object to conform to the KiltCredentialV1 data model.
 *
 * @param input
 * @param issuer
 * @param timestamp
 * @param chainGenesisHash
 * @param ctype
 */
export function fromICredential(
  input: ICredential,
  issuer: DidUri,
  timestamp: number,
  chainGenesisHash: Uint8Array,
  ctype?: ICType
): Omit<VerifiableCredential, 'proof'> {
  const { legitimations, delegationId, rootHash, claim } = input

  // write root hash to id
  const id = credentialIdFromRootHash(hexToU8a(rootHash))

  // transform & annotate claim to be json-ld and VC conformant
  const { credentialSubject } = Claim.toJsonLD(claim, false) as {
    credentialSubject: VerifiableCredential['credentialSubject']
  }

  let credentialSchema: JsonSchemaValidator2018
  if (ctype && ctype.$id !== CType.hashToId(claim.cTypeHash)) {
    credentialSchema = {
      id: ctype.$id,
      type: JSON_SCHEMA_TYPE,
      name: ctype.title,
      schema: ctype,
    }
  } else {
    credentialSchema = {
      id: CType.hashToId(claim.cTypeHash),
      type: JSON_SCHEMA_TYPE,
    }
  }

  const chainId: Caip2ChainId = `polkadot:${u8aToHex(
    chainGenesisHash,
    128,
    false
  )}`
  const credentialStatus: KiltRevocationStatusV1 = {
    id: chainId,
    type: KILT_REVOCATION_STATUS_V1_TYPE,
  }

  const federatedTrustModel: VerifiableCredential['federatedTrustModel'] =
    legitimations.map(({ rootHash }) => ({
      id: credentialIdFromRootHash(hexToU8a(rootHash)),
      type: KILT_ATTESTER_LEGITIMATION_V1_TYPE,
    }))
  if (delegationId) {
    const delegation: KiltAttesterDelegationV1 = {
      id: `${chainId}/kilt:delegation/${base58Encode(hexToU8a(delegationId))}`,
      type: KILT_ATTESTER_DELEGATION_V1_TYPE,
    }
    federatedTrustModel.push(delegation)
  }

  const issuanceDate = new Date(timestamp).toISOString()

  return {
    '@context': DEFAULT_CREDENTIAL_CONTEXTS,
    type: DEFAULT_CREDENTIAL_TYPES,
    id,
    nonTransferable: true,
    credentialSubject,
    credentialSchema,
    issuer,
    issuanceDate,
    credentialStatus,
    federatedTrustModel,
  }
}

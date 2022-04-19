/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module VCExport
 */

import { isHex } from '@polkadot/util'
import type { AnyJson } from '@polkadot/types/types'
import { ClaimUtils } from '@kiltprotocol/core'
import type { ICredential, ICType } from '@kiltprotocol/types'
import type { HexString } from '@polkadot/util/types'
import {
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTED_PROOF_TYPE,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
  KILT_SELF_SIGNED_PROOF_TYPE,
  KILT_CREDENTIAL_CONTEXT_URL,
  KILT_VERIFIABLECREDENTIAL_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
} from './constants.js'
import type {
  AttestedProof,
  CredentialDigestProof,
  CredentialSchema,
  Proof,
  SelfSignedProof,
  VerifiableCredential,
} from './types.js'

export function fromCredentialIRI(credentialId: string): HexString {
  const hexString = credentialId.startsWith(KILT_CREDENTIAL_IRI_PREFIX)
    ? credentialId.substring(KILT_CREDENTIAL_IRI_PREFIX.length)
    : credentialId
  if (!isHex(hexString))
    throw new Error(
      'credential id is not a valid identifier (could not extract base16 / hex encoded string)'
    )
  return hexString
}

export function toCredentialIRI(rootHash: string): string {
  if (rootHash.startsWith(KILT_CREDENTIAL_IRI_PREFIX)) {
    return rootHash
  }
  if (!isHex(rootHash))
    throw new Error('root hash is not a base16 / hex encoded string)')
  return KILT_CREDENTIAL_IRI_PREFIX + rootHash
}

export function fromCredential(
  input: ICredential,
  ctype?: ICType
): VerifiableCredential {
  const {
    claimHashes,
    legitimations,
    delegationId,
    rootHash,
    claimerSignature,
    claim,
  } = input.request

  // write root hash to id
  const id = toCredentialIRI(rootHash)

  // transform & annotate claim to be json-ld and VC conformant
  const { credentialSubject } = ClaimUtils.toJsonLD(claim, false) as Record<
    string,
    Record<string, AnyJson>
  >

  const issuer = input.attestation.owner

  // add current date bc we have no issuance date on credential
  // TODO: could we get this from block time or something?
  const issuanceDate = new Date().toISOString()

  // if ctype is given, add as credential schema
  let credentialSchema: CredentialSchema | undefined
  if (ctype) {
    const { schema, owner } = ctype
    credentialSchema = {
      '@id': schema.$id,
      '@type': JSON_SCHEMA_TYPE,
      name: schema.title,
      schema,
      author: owner || undefined,
    }
  }

  const legitimationIds = legitimations.map((leg) => leg.request.rootHash)

  const proof: Proof[] = []

  const VC: VerifiableCredential = {
    '@context': [
      DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
      KILT_CREDENTIAL_CONTEXT_URL,
    ],
    type: [DEFAULT_VERIFIABLECREDENTIAL_TYPE, KILT_VERIFIABLECREDENTIAL_TYPE],
    id,
    credentialSubject,
    legitimationIds,
    delegationId: delegationId || undefined,
    issuer,
    issuanceDate,
    nonTransferable: true,
    proof,
    credentialSchema,
  }

  // add self-signed proof
  if (claimerSignature) {
    const sSProof: SelfSignedProof = {
      type: KILT_SELF_SIGNED_PROOF_TYPE,
      proofPurpose: 'assertionMethod',
      verificationMethod: claimerSignature.keyUri,
      signature: claimerSignature.signature,
      challenge: claimerSignature.challenge,
    }
    VC.proof.push(sSProof)
  }

  // add attestation proof
  const attProof: AttestedProof = {
    type: KILT_ATTESTED_PROOF_TYPE,
    proofPurpose: 'assertionMethod',
    attester: input.attestation.owner,
  }
  VC.proof.push(attProof)

  // add hashed properties proof
  const cDProof: CredentialDigestProof = {
    type: KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
    proofPurpose: 'assertionMethod',
    nonces: input.request.claimNonceMap,
    claimHashes,
  }
  VC.proof.push(cDProof)

  return VC
}

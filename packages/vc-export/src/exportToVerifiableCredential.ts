/**
 * @packageDocumentation
 * @module VCExport
 */

import { decodeAddress } from '@polkadot/keyring'
import { isHex, u8aToHex } from '@polkadot/util'
import type { AnyJson } from '@polkadot/types/types'
import { Did, ClaimUtils } from '@kiltprotocol/core'
import type { IAttestedClaim, ICType } from '@kiltprotocol/types'
import { signatureVerify } from '@polkadot/util-crypto'
import {
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  JSON_SCHEMA_TYPE,
  KeyTypesMap,
  KILT_ATTESTED_PROOF_TYPE,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
  KILT_SELF_SIGNED_PROOF_TYPE,
  KILT_CREDENTIAL_CONTEXT_URL,
  KILT_VERIFIABLECREDENTIAL_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
} from './constants'
import type {
  AttestedProof,
  CredentialDigestProof,
  CredentialSchema,
  Proof,
  SelfSignedProof,
  VerifiableCredential,
} from './types'

export function fromCredentialURI(credentialId: string): string {
  const hexString = credentialId.startsWith(KILT_CREDENTIAL_IRI_PREFIX)
    ? credentialId.substring(KILT_CREDENTIAL_IRI_PREFIX.length)
    : credentialId
  if (!isHex(hexString))
    throw new Error(
      'credential id is not a valid identifier (could not extract base16 / hex encoded string)'
    )
  return hexString
}

export function toCredentialURI(rootHash: string): string {
  if (rootHash.startsWith(KILT_CREDENTIAL_IRI_PREFIX)) {
    return rootHash
  }
  if (!isHex(rootHash))
    throw new Error('root hash is not a base16 / hex encoded string)')
  return KILT_CREDENTIAL_IRI_PREFIX + rootHash
}

export function fromAttestedClaim(
  input: IAttestedClaim,
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
  const id = toCredentialURI(rootHash)

  // transform & annotate claim to be json-ld and VC conformant
  const { credentialSubject } = ClaimUtils.toJsonLD(claim, false) as Record<
    string,
    Record<string, AnyJson>
  >

  const issuer = Did.getIdentifierFromAddress(input.attestation.owner)

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
      author: owner ? Did.getIdentifierFromAddress(owner) : undefined,
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
  // infer key type
  const keyType: string | undefined =
    KeyTypesMap[signatureVerify('', claimerSignature, claim.owner).crypto]
  if (!keyType)
    throw new TypeError(
      `Unknown signature type on credential.\nCurrently this handles ${JSON.stringify(
        Object.keys(KeyTypesMap)
      )}\nReceived: ${keyType}`
    )
  const sSProof: SelfSignedProof = {
    type: KILT_SELF_SIGNED_PROOF_TYPE,
    proofPurpose: 'assertionMethod',
    verificationMethod: {
      type: keyType,
      publicKeyHex: u8aToHex(decodeAddress(claim.owner)),
    },
    signature: claimerSignature,
  }
  VC.proof.push(sSProof)

  // add attestation proof
  const attProof: AttestedProof = {
    type: KILT_ATTESTED_PROOF_TYPE,
    proofPurpose: 'assertionMethod',
    attesterAddress: input.attestation.owner,
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

export default { fromAttestedClaim }

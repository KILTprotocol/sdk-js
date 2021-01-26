import { decodeAddress } from '@polkadot/keyring'
import { u8aToHex } from '@polkadot/util'
import { AnyJson } from '@polkadot/types/types'
import { Did, ClaimUtils } from '@kiltprotocol/core'
import { IAttestedClaim, ICType } from '@kiltprotocol/types'
import {
  AttestedProof,
  CredentialDigestProof,
  CredentialSchema,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTED_PROOF_TYPE,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
  KILT_SELF_SIGNED_PROOF_TYPE,
  Proof,
  SelfSignedProof,
  VerifiableCredential,
} from './types'

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
  const id = rootHash

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
    '@context': [DEFAULT_VERIFIABLECREDENTIAL_CONTEXT],
    type: [DEFAULT_VERIFIABLECREDENTIAL_TYPE],
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
  const sSProof: SelfSignedProof = {
    type: KILT_SELF_SIGNED_PROOF_TYPE,
    verificationMethod: {
      type: 'Ed25519VerificationKey2018',
      publicKeyHex: u8aToHex(decodeAddress(claim.owner)),
    },
    signature: claimerSignature,
  }
  VC.proof.push(sSProof)

  // add attestation proof
  const attProof: AttestedProof = {
    type: KILT_ATTESTED_PROOF_TYPE,
    attesterAddress: input.attestation.owner,
  }
  VC.proof.push(attProof)

  // add hashed properties proof
  const cDProof: CredentialDigestProof = {
    type: KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
    nonces: input.request.claimNonceMap,
    claimHashes,
  }
  VC.proof.push(cDProof)

  return VC
}

export default { fromAttestedClaim }

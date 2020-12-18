import { decodeAddress } from '@polkadot/keyring'
import { u8aToHex } from '@polkadot/util'
import { AnyJson } from '@polkadot/types/types'
import { IAttestedClaim, Did, ICType } from '@kiltprotocol/core'
import { toJsonLD } from '@kiltprotocol/core/lib/claim/Claim.utils'
import {
  attestedProof,
  CredentialSchema,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTED_PROOF_TYPE,
  KILT_REVEAL_PROPERTY_TYPE,
  KILT_SELF_SIGNED_PROOF_TYPE,
  Proof,
  selfSignedProof,
  VerifiableCredential,
} from './types'

export function fromAttestedClaim(
  input: IAttestedClaim,
  subjectDid = false,
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
  const { credentialSubject } = toJsonLD(
    { ...claim, owner: subjectDid ? `did:kilt:${claim.owner}` : claim.owner },
    false
  ) as Record<string, Record<string, AnyJson>>

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
      author: owner || undefined,
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
    claimHashes,
    issuer,
    issuanceDate,
    nonTransferable: true,
    proof,
    credentialSchema,
  }

  // add self-signed proof
  VC.proof.push({
    type: KILT_SELF_SIGNED_PROOF_TYPE,
    verificationMethod: {
      type: 'Ed25519VerificationKey2018',
      publicKeyHex: u8aToHex(decodeAddress(claim.owner)),
    },
    signature: claimerSignature,
  } as selfSignedProof)

  // add attestation proof
  const attester = input.attestation.owner
  VC.proof.push({
    type: KILT_ATTESTED_PROOF_TYPE,
    attesterAddress: attester,
  } as attestedProof)

  // add hashed properties proof
  VC.proof.push({
    type: KILT_REVEAL_PROPERTY_TYPE,
    nonces: input.request.claimNonceMap,
  })

  return VC
}

export default { fromAttestedClaim }

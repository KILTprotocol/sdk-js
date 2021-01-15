import { u8aConcat, hexToU8a, u8aToHex } from '@polkadot/util'
import { signatureVerify, blake2AsHex } from '@polkadot/util-crypto'
import jsonld from 'jsonld'
import Ajv from 'ajv'
import { Attestation, Crypto, CTypeSchema } from '@kiltprotocol/core'
import {
  VerifiableCredential,
  SelfSignedProof,
  KILT_SELF_SIGNED_PROOF_TYPE,
  AttestedProof,
  KILT_ATTESTED_PROOF_TYPE,
  CredentialDigestProof,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
} from './types'

export interface VerificationResult {
  verified: boolean
  errors: Error[]
}

export enum AttestationStatus {
  valid = 'valid',
  invalid = 'invalid',
  revoked = 'revoked',
  unknown = 'unknown',
}

export interface AttestationVerificationResult extends VerificationResult {
  status: AttestationStatus
}

const CREDENTIAL_MALFORMED_ERROR = (reason: string): Error =>
  new Error(`Credential malformed: ${reason}`)

const PROOF_MALFORMED_ERROR = (reason: string): Error =>
  new Error(`Proof malformed: ${reason}`)

/**
 * Verifies a KILT self signed proof (claimer signature) against a KILT style Verifiable Credential.
 * This entails computing the root hash from the hashes contained in the `protected` section of the credentialSubject.
 * The resulting hash is then verified against the signature and public key contained in the proof (the latter
 * could be a DID reference in the future). It is also expected to by identical to the credential id.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @returns Object indicating whether proof could be verified.
 */
export function verifySelfSignedProof(
  credential: VerifiableCredential,
  proof: SelfSignedProof
): VerificationResult {
  const result: VerificationResult = { verified: true, errors: [] }
  try {
    // check proof
    if (proof.type !== KILT_SELF_SIGNED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    if (!proof.signature) throw PROOF_MALFORMED_ERROR('signature missing')
    let signerPubKey: string
    const { verificationMethod } = proof
    if (
      typeof verificationMethod === 'object' &&
      verificationMethod.publicKeyHex
    ) {
      if (verificationMethod.type !== 'Ed25519VerificationKey2018')
        throw PROOF_MALFORMED_ERROR(
          `signature type unknown; expected "Ed25519VerificationKey2018", got "${verificationMethod.type}"`
        )
      signerPubKey = verificationMethod.publicKeyHex
    } else {
      throw PROOF_MALFORMED_ERROR(
        'proof must contain public key; resolve did key references beforehand'
      )
    }

    // validate signature over root hash
    if (!signatureVerify(credential.id, proof.signature, signerPubKey).isValid)
      throw new Error('signature could not be verified')
    return result
  } catch (e) {
    result.verified = false
    result.errors = [e]
    return result
  }
}

/**
 * Verifies a KILT attestation proof by querying data from the KILT blockchain.
 * This includes querying the KILT blockchain with the credential id, which returns an attestation record if attested.
 * This record is then compared against attester address and delegation id (the latter of which is taken directly from the credential).
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @returns Object indicating whether proof could be verified.
 */
export async function verifyAttestedProof(
  credential: VerifiableCredential,
  proof: AttestedProof
): Promise<AttestationVerificationResult> {
  let status: AttestationStatus = AttestationStatus.unknown
  try {
    // check proof
    if (proof.type !== KILT_ATTESTED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    const { attesterAddress } = proof
    if (typeof attesterAddress !== 'string' || !attesterAddress)
      throw PROOF_MALFORMED_ERROR('attester address not understood')
    const claimHash = credential.id
    if (typeof claimHash !== 'string' || !claimHash)
      throw CREDENTIAL_MALFORMED_ERROR(
        'claim id (=claim hash) missing / invalid'
      )
    let delegationId: string | null

    switch (typeof credential.delegationId) {
      case 'string':
        delegationId = credential.delegationId
        break
      case 'undefined':
        delegationId = null
        break
      default:
        throw CREDENTIAL_MALFORMED_ERROR('delegationId not understood')
    }
    // query on-chain data by credential id (= claim root hash)
    const onChain = await Attestation.query(claimHash)
    // if not found, credential has not been attested, proof is invalid
    status = AttestationStatus.invalid
    if (!onChain)
      throw new Error(
        `attestation for credential with id ${claimHash} not found`
      )
    // if data on proof does not correspond to data on chain, proof is incorrect
    if (
      onChain.owner !== attesterAddress ||
      onChain.delegationId !== delegationId
    )
      throw new Error(
        `proof not matching on-chain data: proof ${{
          attester: attesterAddress,
          delegation: delegationId,
        }}`
      )
    // if proof data is valid but attestation is flagged as revoked, credential is no longer valid
    if (onChain.revoked) {
      status = AttestationStatus.revoked
      throw new Error('attestation revoked')
    }
  } catch (e) {
    return {
      verified: false,
      errors: [e],
      status,
    }
  }
  return { verified: true, errors: [], status: AttestationStatus.valid }
}

/**
 * Verifies a proof that reveals the content of selected properties to a verifier. This enables selective disclosure.
 * Values and nonces contained within this proof will be hashed, the result of which is expected to equal hashes on the credential.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @param options Allows passing custom hasher.
 * @param options.hasher A custom hasher. Defaults to hex(blake2-256('nonce'+'value')).
 * @returns Object indicating whether proof could be verified.
 */
export async function verifyCredentialDigestProof(
  credential: VerifiableCredential,
  proof: CredentialDigestProof,
  options: { hasher?: Crypto.Hasher } = {}
): Promise<VerificationResult> {
  const {
    hasher = (value, nonce?) => blake2AsHex((nonce || '') + value, 256),
  } = options
  const result: VerificationResult = { verified: true, errors: [] }
  try {
    // check proof
    if (proof.type !== KILT_CREDENTIAL_DIGEST_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    if (typeof proof.nonces !== 'object') {
      throw PROOF_MALFORMED_ERROR('proof must contain object "nonces"')
    }
    if (typeof credential.credentialSubject !== 'object')
      throw CREDENTIAL_MALFORMED_ERROR('credential subject missing')

    // 1: check credential digest against credential contents & claim property hashes in proof
    // collect hashes from hash array, legitimations & delegationId
    const hashes: string[] = proof.claimHashes.concat(
      credential.legitimationIds,
      credential.delegationId || []
    )
    // convert hex hashes to byte arrays & concatenate
    const concatenated = u8aConcat(
      ...hashes.map((hexHash) => hexToU8a(hexHash))
    )
    const rootHash = Crypto.hash(concatenated)

    // throw if root hash does not match expected (=id)
    const expectedRootHash = credential.id
    if (expectedRootHash !== u8aToHex(rootHash))
      throw new Error('computed root hash does not match expected')

    // 2: check individual properties against claim hashes in proof
    // expand credentialSubject keys by compacting with empty context credential to produce statements
    const flattened = await jsonld.compact(credential.credentialSubject, {})
    const statements = Object.entries(flattened).map(([key, value]) =>
      JSON.stringify({ [key]: value })
    )
    const expectedUnsalted = Object.keys(proof.nonces)

    return statements.reduce<VerificationResult>(
      (r, stmt) => {
        const unsalted = hasher(stmt)
        if (!expectedUnsalted.includes(unsalted))
          return {
            verified: false,
            errors: [
              ...r.errors,
              PROOF_MALFORMED_ERROR(
                `Proof contains no digest for statement ${stmt}`
              ),
            ],
          }
        const nonce = proof.nonces[unsalted]
        if (!proof.claimHashes.includes(hasher(unsalted, nonce)))
          return {
            verified: false,
            errors: [
              ...r.errors,
              new Error(
                `Proof for statement ${stmt} not valid against claimHashes`
              ),
            ],
          }
        return r
      },
      { verified: true, errors: [] }
    )
  } catch (e) {
    result.verified = false
    result.errors = [e]
    return result
  }
}

export function validateSchema(
  credential: VerifiableCredential
): VerificationResult {
  const { schema } = credential.credentialSchema || {}
  // if present, perform schema validation
  if (schema) {
    // there's no rule against additional properties, so we can just validate the ones that are there
    const ajv = new Ajv()
    ajv.addMetaSchema(CTypeSchema.CTypeModel)
    const result = ajv.validate(schema, credential.credentialSubject)
    return {
      verified: typeof result === 'boolean' && result,
      errors: ajv.errors?.map((e) => new Error(e.message)) || [],
    }
  }
  return { verified: false, errors: [] }
}

export default {
  verifySelfSignedProof,
  verifyCredentialDigestProof,
  verifyAttestedProof,
  validateSchema,
}

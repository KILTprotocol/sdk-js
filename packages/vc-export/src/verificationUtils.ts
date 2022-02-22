/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module VerificationUtils
 */

import { u8aConcat, hexToU8a, u8aToHex } from '@polkadot/util'
import {
  signatureVerify,
  blake2AsHex,
  base58Decode,
} from '@polkadot/util-crypto'
import jsonld from 'jsonld'
import { Attestation, CType } from '@kiltprotocol/core'
import { Crypto, JsonSchema } from '@kiltprotocol/utils'
import { DocumentLoader } from 'jsonld-signatures'
import { VerificationKeyTypesMap } from '@kiltprotocol/types'
import {
  KILT_SELF_SIGNED_PROOF_TYPE,
  KILT_ATTESTED_PROOF_TYPE,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
} from './constants.js'
import type {
  VerifiableCredential,
  SelfSignedProof,
  AttestedProof,
  CredentialDigestProof,
  IPublicKeyRecord,
} from './types.js'
import { fromCredentialIRI } from './exportToVerifiableCredential.js'

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
 * could be a DID URI). It is also expected to by identical to the credential id.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @param documentLoader Must be able to KILT DID fragments (i.e. The key reference).
 * @returns Object indicating whether proof could be verified.
 */
export async function verifySelfSignedProof(
  credential: VerifiableCredential,
  proof: SelfSignedProof,
  documentLoader: DocumentLoader
): Promise<VerificationResult> {
  const result: VerificationResult = { verified: true, errors: [] }
  try {
    // check proof
    const type = proof['@type'] || proof.type
    if (type !== KILT_SELF_SIGNED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    if (!proof.signature) throw PROOF_MALFORMED_ERROR('signature missing')
    let { verificationMethod } = proof
    // we always fetch the verification method to make sure the key is in fact associated with the did
    if (typeof verificationMethod !== 'string') {
      verificationMethod = verificationMethod.id
    }
    if (!verificationMethod) {
      throw new Error('verificationMethod not understood')
    }
    const dereferenced = documentLoader
      ? await documentLoader(verificationMethod)
      : undefined
    if (!dereferenced?.document) {
      throw new Error(
        'verificationMethod could not be dereferenced; did you select an appropriate document loader?'
      )
    }
    verificationMethod = dereferenced.document as IPublicKeyRecord

    const credentialOwner =
      credential.credentialSubject.id || credential.credentialSubject['@id']
    if (!verificationMethod.controller === credentialOwner)
      throw new Error('credential subject is not owner of signing key')
    const keyType = verificationMethod.type || verificationMethod['@type']
    if (!Object.values(VerificationKeyTypesMap).includes(keyType))
      throw PROOF_MALFORMED_ERROR(
        `signature type unknown; expected one of ${JSON.stringify(
          Object.values(VerificationKeyTypesMap)
        )}, got "${verificationMethod.type}"`
      )
    const signerPubKey = verificationMethod.publicKeyBase58
    if (!signerPubKey)
      throw new Error('signer key is missing publicKeyBase58 property')

    const rootHash = fromCredentialIRI(credential.id)
    // validate signature over root hash
    // signatureVerify can handle all required signature types out of the box
    const verification = signatureVerify(
      rootHash,
      proof.signature,
      base58Decode(signerPubKey)
    )
    if (
      !(
        verification.isValid &&
        VerificationKeyTypesMap[verification.crypto] === keyType
      )
    ) {
      throw new Error('signature could not be verified')
    }
    return result
  } catch (e) {
    result.verified = false
    result.errors = [e as Error]
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
    const type = proof['@type'] || proof.type
    if (type !== KILT_ATTESTED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    const { attester } = proof
    if (typeof attester !== 'string' || !attester)
      throw PROOF_MALFORMED_ERROR('attester DID not understood')
    if (attester !== credential.issuer)
      throw PROOF_MALFORMED_ERROR('attester DID not matching credential issuer')
    if (typeof credential.id !== 'string' || !credential.id)
      throw CREDENTIAL_MALFORMED_ERROR(
        'claim id (=claim hash) missing / invalid'
      )
    const claimHash = fromCredentialIRI(credential.id)

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
    if (!onChain) {
      status = AttestationStatus.invalid
      throw new Error(
        `attestation for credential with id ${claimHash} not found`
      )
    }
    // if data on proof does not correspond to data on chain, proof is incorrect
    if (onChain.owner !== attester || onChain.delegationId !== delegationId) {
      status = AttestationStatus.invalid
      throw new Error(
        `proof not matching on-chain data: proof ${{
          attester,
          delegation: delegationId,
        }}`
      )
    }
    // if proof data is valid but attestation is flagged as revoked, credential is no longer valid
    if (onChain.revoked) {
      status = AttestationStatus.revoked
      throw new Error('attestation revoked')
    }
  } catch (e) {
    return {
      verified: false,
      errors: [e as Error],
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
    const type = proof['@type'] || proof.type
    if (type !== KILT_CREDENTIAL_DIGEST_PROOF_TYPE)
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
    const expectedRootHash = fromCredentialIRI(credential.id)
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
    result.errors = [e as Error]
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
    const validator = new JsonSchema.Validator(schema)
    validator.addSchema(CType.Schemas.CTypeModel)
    const result = validator.validate(credential.credentialSubject)
    return {
      verified: result.valid,
      errors: result.errors?.map((e) => new Error(e.error)) || [],
    }
  }
  return { verified: false, errors: [] }
}

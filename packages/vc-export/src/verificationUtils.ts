/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */

import { u8aConcat, hexToU8a, u8aToHex } from '@polkadot/util'
import {
  signatureVerify,
  blake2AsHex,
  base58Decode,
} from '@polkadot/util-crypto'
import jsonld from 'jsonld'
import { ApiPromise } from '@polkadot/api'
import { Attestation, CType } from '@kiltprotocol/core'
import { Crypto, JsonSchema, SDKErrors } from '@kiltprotocol/utils'
import type { DocumentLoader } from 'jsonld-signatures'
import { verificationKeyTypesMap } from '@kiltprotocol/types'
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

export type AttestationStatus = 'valid' | 'invalid' | 'revoked' | 'unknown'

export interface AttestationVerificationResult extends VerificationResult {
  status: AttestationStatus
}

export class CredentialMalformedError extends SDKErrors.SDKError {
  constructor(reason: string) {
    super(`Credential malformed: ${reason}`)
  }
}

export class ProofMalformedError extends SDKErrors.SDKError {
  constructor(reason: string) {
    super(`Proof malformed: ${reason}`)
  }
}

/**
 * Verifies a KILT self-signed proof (claimer signature) against a KILT style Verifiable Credential.
 * This entails computing the root hash from the hashes contained in the `protected` section of the credentialSubject.
 * The resulting hash is then verified against the signature and public key contained in the proof (the latter
 * could be a DID URI). It is also expected to by identical to the credential id.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self-signed proof object.
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
    const type = proof['@type'] ?? proof.type
    if (type !== KILT_SELF_SIGNED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    if (!proof.signature) throw new ProofMalformedError('signature missing')
    let { verificationMethod } = proof
    // we always fetch the verification method to make sure the key is in fact associated with the DID
    if (typeof verificationMethod !== 'string') {
      verificationMethod = verificationMethod.id
    }
    if (typeof verificationMethod !== 'string') {
      throw new Error('verificationMethod not understood')
    }
    if (typeof documentLoader !== 'function') {
      throw new Error('did you select an appropriate document loader?')
    }
    const dereferenced = await documentLoader(verificationMethod)
    if (!('document' in dereferenced)) {
      throw new Error(
        'verificationMethod could not be dereferenced; did you select an appropriate document loader?'
      )
    }
    verificationMethod = dereferenced.document as IPublicKeyRecord

    const credentialOwner =
      credential.credentialSubject.id ?? credential.credentialSubject['@id']
    if (verificationMethod.controller !== credentialOwner)
      throw new Error('Credential subject is not owner of signing key')
    const keyType = verificationMethod.type ?? verificationMethod['@type']
    if (!Object.values(verificationKeyTypesMap).includes(keyType))
      throw new ProofMalformedError(
        `Signature type unknown; expected one of ${JSON.stringify(
          Object.values(verificationKeyTypesMap)
        )}, got "${verificationMethod.type}"`
      )
    const signerPubKey = verificationMethod.publicKeyBase58
    if (typeof signerPubKey !== 'string')
      throw new Error('Signer key is missing publicKeyBase58 property')

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
        Object.values(verificationKeyTypesMap).includes(keyType)
      )
    ) {
      throw new Error('Signature could not be verified')
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
 * @param proof KILT self-signed proof object.
 * @param api The API connection.
 * @returns Object indicating whether proof could be verified.
 */
export async function verifyAttestedProof(
  credential: VerifiableCredential,
  proof: AttestedProof,
  api: ApiPromise
): Promise<AttestationVerificationResult> {
  let status: AttestationStatus = 'unknown'
  try {
    // check proof
    const type = proof['@type'] ?? proof.type
    if (type !== KILT_ATTESTED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    const { attester } = proof
    if (typeof attester !== 'string' || !attester)
      throw new ProofMalformedError('Attester DID not understood')
    if (attester !== credential.issuer)
      throw new ProofMalformedError(
        'Attester DID not matching credential issuer'
      )
    if (typeof credential.id !== 'string' || !credential.id)
      throw new CredentialMalformedError(
        'Claim id (=claim hash) missing / invalid'
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
        throw new CredentialMalformedError('delegationId not understood')
    }

    // query on-chain data by credential id (= claim root hash)
    const encoded = await api.query.attestation.attestations(claimHash)
    // if not found, credential has not been attested, proof is invalid
    if (encoded.isNone) {
      status = 'invalid'
      throw new Error(
        `Attestation for credential with id "${claimHash}" not found`
      )
    }
    const onChain = Attestation.fromChain(encoded, claimHash)
    // if data on proof does not correspond to data on chain, proof is incorrect
    if (onChain.owner !== attester || onChain.delegationId !== delegationId) {
      status = 'invalid'
      throw new Error(
        `Proof not matching on-chain data: attester "${attester}", delegation: "${delegationId}"`
      )
    }
    // if proof data is valid but attestation is flagged as revoked, credential is no longer valid
    if (onChain.revoked === true) {
      status = 'revoked'
      throw new Error('Attestation revoked')
    }
  } catch (e) {
    return {
      verified: false,
      errors: [e as Error],
      status,
    }
  }
  return { verified: true, errors: [], status: 'valid' }
}

/**
 * Verifies a proof that reveals the content of selected properties to a verifier. This enables selective disclosure.
 * Values and nonces contained within this proof will be hashed, the result of which is expected to equal hashes on the credential.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self-signed proof object.
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
    const type = proof['@type'] ?? proof.type
    if (type !== KILT_CREDENTIAL_DIGEST_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    if (typeof proof.nonces !== 'object') {
      throw new ProofMalformedError('Proof must contain object "nonces"')
    }
    if (typeof credential.credentialSubject !== 'object')
      throw new CredentialMalformedError('Credential subject missing')

    // 1: check credential digest against credential contents & claim property hashes in proof
    // collect hashes from hash array, legitimations & delegationId
    const hashes = proof.claimHashes.concat(
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
      throw new Error('Computed root hash does not match expected')

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
              new ProofMalformedError(
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
                `Proof for statement "${stmt}" not valid against claimHashes`
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

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition on the `credentialSchema` property.
 *
 * @param credential A verifiable credential where `credentialSchema.schema` is an [[ICType]].
 * @returns The [[VerificationResult]].
 */
export function validateSchema(
  credential: VerifiableCredential
): VerificationResult {
  const { schema } = credential.credentialSchema || {}
  // if present, perform schema validation
  if (schema) {
    // there's no rule against additional properties, so we can just validate the ones that are there
    const validator = new JsonSchema.Validator(schema)
    validator.addSchema(CType.Schemas.CTypeModel)
    const { errors, valid } = validator.validate(credential.credentialSubject)
    return {
      verified: valid,
      errors: errors.length > 0 ? errors.map((e) => new Error(e.error)) : [],
    }
  }
  return { verified: false, errors: [] }
}

/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */

import { u8aConcat } from '@polkadot/util'
import { base58Decode, base58Encode, sha256AsU8a } from '@polkadot/util-crypto'

import type {
  CryptoSuite,
  SignerInterface,
} from '@kiltprotocol/jcs-data-integrity-proofs-common'

import { parse, resolve } from '@kiltprotocol/did'
import type { DidUrl, VerificationMethod } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import type { SecuredDocument } from './utils.js'

export const PROOF_TYPE = 'DataIntegrityProof'

// VCDM 2.0 core context
const VC_2_0_CONTEXT = 'https://www.w3.org/ns/credentials/v2'
const DATA_INTEGRITY_CONTEXT = 'https://w3id.org/security/data-integrity/v1'

// multibase base58-btc header
const MULTIBASE_BASE58BTC_HEADER = 'z'

function containsDefinitions(context: unknown): context is string {
  return context === VC_2_0_CONTEXT || context === DATA_INTEGRITY_CONTEXT
}
function ensureContext<T>(document: T): T & { '@context': unknown[] } {
  let context = document['@context'] ?? []
  if (Array.isArray(context)) {
    if (!context.some(containsDefinitions)) {
      context = [...context, DATA_INTEGRITY_CONTEXT]
    }
  } else if (!containsDefinitions(context)) {
    context = [context, DATA_INTEGRITY_CONTEXT]
  }
  return { ...document, '@context': context }
}

export type DataIntegrityProof = {
  type: typeof PROOF_TYPE
  verificationMethod: string
  cryptosuite: string
  proofPurpose: string
  proofValue: string
  created?: string
  expires?: string
  domain?: string
  challenge?: string
  previousProof?: string
}

/**
 * Creates a data integrity proof for the provided document.
 * This function:
 * - Validates that the signer's algorithm matches the suite's required algorithm.
 * - Adds the data integrity json-ld context definitions to the document if necessary.
 * - Constructs a proof with default and provided properties.
 * - Transforms and hashes the proof and document.
 * - Generates a signature using the signer.
 * - Appends the signature to the proof.
 *
 * @param inputDocument - The unsecured document for which the proof needs to be created.
 * @param suite - The cryptographic suite to use for creating the proof.
 * @param signer - The signer interface to sign the document.
 * @param opts - Optional parameters for the proof creation.
 * @param opts.proofPurpose - The purpose of the proof (default is 'authentication').
 * @param opts.challenge - A challenge string to be included in the proof, if any.
 * @param opts.domain - A domain string to be included in the proof, if any.
 * @param opts.created - A Date object indicating the date and time at which this proof becomes valid.
 * Defaults to the current time. Can be unset with `null`.
 * @param opts.expires - A Date object indicating the date and time at which this proof expires.
 * @param opts.id - Assigns an id to the proof. Can be used to implement proof chains.
 * @param opts.previousProof - Allows referencing an existing proof by id for the purpose of implementing proof chains.
 *
 * @returns The original document augmented with the generated proof.
 */
export async function createProof<T>(
  inputDocument: T,
  suite: CryptoSuite<any>,
  signer: SignerInterface,
  {
    proofPurpose = 'authentication',
    challenge,
    domain,
    created = new Date(),
    expires,
    id,
    previousProof,
  }: {
    id?: string
    proofPurpose?: string
    challenge?: string
    domain?: string
    created?: Date | null
    expires?: Date
    previousProof?: string
  } = {}
): Promise<T & { proof: DataIntegrityProof }> {
  if (
    suite.requiredAlgorithm.toLowerCase() !== signer.algorithm.toLowerCase()
  ) {
    throw new Error(
      "signer algorithm does not match the suite's required algorithm"
    )
  }

  // TODO: adding the suite context to the document interferes with existing proofs, but is currently required (see https://github.com/digitalbazaar/data-integrity/issues/19).
  const document = ensureContext(inputDocument)

  const proof = {
    ...(id ? { id } : undefined),
    type: PROOF_TYPE,
    verificationMethod: signer.id,
    cryptosuite: suite.name,
    proofPurpose,
  } as DataIntegrityProof
  if (created) {
    proof.created = created.toISOString()
  }
  if (expires) {
    proof.expires = expires.toISOString()
  }
  if (challenge) {
    proof.challenge = challenge
  }
  if (domain) {
    proof.domain = domain
  }
  if (previousProof) {
    proof.previousProof = previousProof
  }

  const canonizedProof = await suite.canonize({
    // TODO: It's unclear if this behaviour is desirable (see https://github.com/digitalbazaar/data-integrity/issues/19).
    // Adding the document context to the proof should NOT happen for a jcs proof according to the relevant specs;
    // however both digitalbazaar/jsonld-signatures as well as digitalbazaar/data-integrity currently do enforce this.
    // Not sure how to proceed; implement to spec or allow interoperability.
    '@context': document['@context'],
    ...proof,
  })
  const canonizedDoc = await suite.canonize(document)

  const combinedHashes = u8aConcat(
    sha256AsU8a(canonizedProof),
    sha256AsU8a(canonizedDoc)
  )
  const signatureBytes = await signer.sign({ data: combinedHashes })
  proof.proofValue = MULTIBASE_BASE58BTC_HEADER + base58Encode(signatureBytes)

  return { ...document, proof }
}

export class UNSUPPORTED_CRYPTOSUITE_ERROR extends Error {
  override name = 'UNSUPPORTED_CRYPTOSUITE_ERROR'
}

export class UNEXPECTED_CONTROLLER_ERROR extends Error {
  override name = 'UNEXPECTED_CONTROLLER_ERROR'
}

export class PROOF_TRANSFORMATION_ERROR extends Error {
  override name = 'PROOF_TRANSFORMATION_ERROR' // Specified by cryptosuite specs
}

export class MALFORMED_PROOF_ERROR extends Error {
  override name = 'MALFORMED_PROOF_ERROR'
  public readonly code = -17
}

export class MISMATCHED_PROOF_PURPOSE_ERROR extends Error {
  override name = 'MISMATCHED_PROOF_PURPOSE_ERROR'
  public readonly code = -18
}

export class INVALID_DOMAIN_ERROR extends Error {
  override name = 'INVALID_DOMAIN_ERROR'
  public readonly code = -19
}

export class INVALID_CHALLENGE_ERROR extends Error {
  override name = 'INVALID_CHALLENGE_ERROR'
  public readonly code = -20
}

export class INVALID_PROOF_PURPOSE_FOR_VERIFICATION_METHOD extends Error {
  override name = 'INVALID_PROOF_PURPOSE_FOR_VERIFICATION_METHOD'
  public readonly code = -25
}

async function retrieveVerificationMethod(
  proof: DataIntegrityProof
): Promise<VerificationMethod> {
  const { did } = parse(proof.verificationMethod as DidUrl)
  const { didDocument, didDocumentMetadata, didResolutionMetadata } =
    await resolve(did)
  if (didDocumentMetadata.deactivated) {
    throw new SDKErrors.DidDeactivatedError()
  }
  if (didResolutionMetadata.error) {
    throw new SDKErrors.DidError(didResolutionMetadata.error)
  }
  const verificationMethod = didDocument?.verificationMethod?.find(
    ({ id }) =>
      id === proof.verificationMethod ||
      `${didDocument.id}${id}` === proof.verificationMethod // deals with relative ids in the did document ||
  )
  if (!verificationMethod) {
    throw new SDKErrors.DidNotFoundError(
      `could not resolve verificationMethod ${proof.verificationMethod}`
    )
  }
  const verificationMethodsForPurpose: string[] =
    didDocument?.[proof.proofPurpose] ?? []
  if (!verificationMethodsForPurpose.includes(verificationMethod.id)) {
    throw new INVALID_PROOF_PURPOSE_FOR_VERIFICATION_METHOD()
  }

  return verificationMethod
}

/**
 * Verifies integrity of a document secured by a data integrity proof (proof type: DataIntegrityProof).
 * This function performs multiple checks to ensure the authenticity and correctness of the proof:
 * - Ensures essential properties like type, verificationMethod, and proofPurpose exist in the proof and have allowable values.
 * - Matches the cryptosuite of the proof with cryptosuites supplied to this function via proof options.
 * - Decodes the signature from base58btc multibase encoding.
 * - Retrieves the verification method and ensures it matches expected controllers.
 * - Transforms the document and proof.
 * - Verifies the signature against transformed data.
 * - Optionally checks for challenge & domain, if provided in the proof options.
 *
 * @param document - The document secured by `proof` (may contain additional proofs).
 * @param proof - The data integrity proof to verify.
 * @param proofOptions - Options for the verification process.
 * @param proofOptions.cryptosuites - Array of cryptographic suites to be used for verification; determines which proofs can be verified.
 * @param proofOptions.expectedProofPurpose - Expected purpose of the proof. Throws if mismatched.
 * @param proofOptions.expectedController - Expected controller of the verification method. Throws if mismatched.
 * @param proofOptions.domain - Expected domain for the proof. Throws if mismatched.
 * @param proofOptions.challenge - Expected challenge for the proof. Throws if mismatched.
 * @param proofOptions.now - The reference time for verification as Date (default is current time).
 * @param proofOptions.tolerance - The allowed time drift in milliseconds for time-sensitive checks (default is 0).
 *
 * @returns Returns true if the verification is successful; otherwise, it returns false or throws an error.
 */
export async function verifyProof(
  document: Partial<SecuredDocument>,
  proof: DataIntegrityProof,
  proofOptions: {
    cryptosuites: Array<CryptoSuite<any>>
    expectedProofPurpose?: string
    expectedController?: string
    domain?: string
    challenge?: string
    now?: Date
    tolerance?: number
  }
  // TODO: make VerificationResult?
): Promise<boolean> {
  const { ...unsecuredDocument } = document
  delete unsecuredDocument.proof
  if (!proof.type || !proof.verificationMethod || !proof.proofPurpose) {
    throw new MALFORMED_PROOF_ERROR(
      'proof properties type, verificationMethod, and proofPurpose are required'
    )
  }
  if (
    proofOptions.expectedProofPurpose &&
    proofOptions.expectedProofPurpose !== proof.proofPurpose
  ) {
    throw new MISMATCHED_PROOF_PURPOSE_ERROR()
  }
  if (proof.type !== PROOF_TYPE) {
    throw new PROOF_TRANSFORMATION_ERROR(
      `only ${PROOF_TYPE} type proofs are supported`
    )
  }
  // select cryptosuite for verification
  const suite = proofOptions?.cryptosuites.find(
    ({ name }) => name === proof.cryptosuite
  )
  if (!suite) {
    throw new PROOF_TRANSFORMATION_ERROR(
      `proof's cryptosuite ${
        proof.cryptosuite
      } not among the supported suites [${
        proofOptions.cryptosuites?.map(({ name }) => name) ?? []
      }]`
    )
  }
  // decode signature
  if (proof.proofValue[0] !== MULTIBASE_BASE58BTC_HEADER) {
    throw new Error('only base58btc multibase encoding is supported')
  }
  const signature = base58Decode(proof.proofValue.slice(1))
  // retrieve verification method and create verifier
  const verificationMethod = await retrieveVerificationMethod(proof)
  if (
    proofOptions.expectedController &&
    verificationMethod.controller !== proofOptions.expectedController
  ) {
    throw new UNEXPECTED_CONTROLLER_ERROR()
  }
  const verifier = await suite.createVerifier({
    verificationMethod,
  })
  // transform document & proof options
  const proofOpts: Record<string, unknown> = {
    '@context': unsecuredDocument['@context'],
    ...proof,
  }
  delete proofOpts.proofValue
  const canonizedProof = await suite.canonize(proofOpts)
  const canonizedDoc = await suite.canonize(unsecuredDocument)
  const transformedData = u8aConcat(
    sha256AsU8a(canonizedProof),
    sha256AsU8a(canonizedDoc)
  )
  // verify signature
  const verified = await verifier.verify({ data: transformedData, signature })
  // verify challenge & domain
  // for some reason this is listed as steps following the signature verification in the specs
  if (proofOptions.domain && proofOptions.domain !== proof.domain) {
    throw new INVALID_DOMAIN_ERROR()
  }
  if (proofOptions.challenge && proofOptions.challenge !== proof.challenge) {
    throw new INVALID_CHALLENGE_ERROR()
  }
  const now = proofOptions.now ?? new Date()
  const tolerance = proofOptions.tolerance ?? 0
  if (proof.created && Date.parse(proof.created) > now.getTime() + tolerance) {
    throw new Error('proof created after verification time')
  }
  if (proof.expires && Date.parse(proof.expires) < now.getTime() - tolerance) {
    throw new Error('proof expired before verification time')
  }
  // return result
  return verified
}

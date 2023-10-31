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
  created: string
  verificationMethod: string
  cryptosuite: string
  proofPurpose: string
  proofValue: string
  domain?: string
  challenge?: string
}

/**
 * @param inputDocument
 * @param suite
 * @param signer
 * @param opts
 * @param opts.purpose
 * @param opts.challenge
 * @param opts.domain
 */
export async function createProof<T>(
  inputDocument: T,
  suite: CryptoSuite<any>,
  signer: SignerInterface,
  {
    purpose = 'authentication',
    challenge,
    domain,
  }: { purpose?: string; challenge?: string; domain?: string } = {}
): Promise<T & { proof: DataIntegrityProof }> {
  if (
    suite.requiredAlgorithm.toLowerCase() !== signer.algorithm.toLowerCase()
  ) {
    throw new Error(
      "signer algorithm does not match the suite's required algorithm"
    )
  }
  const document = ensureContext(inputDocument)

  const proof = {
    type: PROOF_TYPE,
    created: new Date().toISOString(),
    verificationMethod: signer.id,
    cryptosuite: suite.name,
    proofPurpose: purpose,
  } as DataIntegrityProof
  if (challenge) {
    proof.challenge = challenge
  }
  if (domain) {
    proof.domain = domain
  }

  const canonizedProof = await suite.canonize({
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
  const { didDocument, didDocumentMetadata } = await resolve(did)
  if (didDocumentMetadata.deactivated) {
    throw new SDKErrors.DidDeactivatedError()
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
 * @param document
 * @param document.proof
 * @param proof
 * @param proofOptions
 * @param proofOptions.cryptosuites
 * @param proofOptions.expectedProofPurpose
 * @param proofOptions.domain
 * @param proofOptions.challenge
 * @param proofOptions.expectedController
 */
export async function verifyProof(
  document: { proof?: unknown },
  proof: DataIntegrityProof,
  proofOptions: {
    cryptosuites: Array<CryptoSuite<any>>
    expectedProofPurpose?: string
    expectedController?: string
    domain?: string
    challenge?: string
  }
): Promise<boolean> {
  const { ...unsecuredDocument } = document
  delete unsecuredDocument.proof
  if (!proof.type || !proof.verificationMethod || !proof.proofPurpose) {
    throw new MALFORMED_PROOF_ERROR(
      'proof properties type, verificationMethod, and proofPurpose are required'
    )
  }
  // TODO: check created timestamp?
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
  // return result
  return verified
}

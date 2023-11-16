/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { cryptosuite as eddsaSuite } from '@kiltprotocol/eddsa-jcs-2022'
import { cryptosuite as ecdsaSuite } from '@kiltprotocol/es256k-jcs-2023'
import type { CryptoSuite } from '@kiltprotocol/jcs-data-integrity-proofs-common'
import { cryptosuite as sr25519Suite } from '@kiltprotocol/sr25519-jcs-2023'

import { resolve } from '@kiltprotocol/did'
import type { Did, DidDocument, SignerInterface } from '@kiltprotocol/types'
import { JsonSchema, SDKErrors, Signers } from '@kiltprotocol/utils'

import {
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_TYPE,
  W3C_PRESENTATION_TYPE,
} from '../V1/constants.js'
import {
  KiltAttestationProofV1,
  KiltRevocationStatusV1,
  Types,
} from '../V1/index.js'
import type {
  KiltCredentialV1,
  VerifiableCredential,
  VerifiablePresentation,
} from '../V1/types.js'
import * as DataIntegrity from '../proofs/DataIntegrity.js'
import {
  VerificationResult,
  VerifyCredentialResult,
  VerifyPresentationResult,
  getProof,
} from '../proofs/utils.js'

export const presentationSchema: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    '@context': { $ref: '#/definitions/contexts' },
    type: {
      oneOf: [
        {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string' },
          contains: { const: W3C_PRESENTATION_TYPE },
        },
        {
          const: W3C_PRESENTATION_TYPE,
        },
      ],
    },
    id: {
      type: 'string',
      format: 'uri',
    },
    verifiableCredential: {
      oneOf: [
        { $ref: '#/definitions/verifiableCredential' },
        {
          type: 'array',
          items: { $ref: '#/definitions/verifiableCredential' },
          minLength: 1,
        },
      ],
    },
    holder: {
      type: 'string',
      format: 'uri',
    },
    proof: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
      },
      required: ['type'],
    },
  },
  required: ['@context', 'type', 'verifiableCredential', 'holder'],
  definitions: {
    verifiableCredential: {
      type: 'object',
      // only checking the minimal definition of a VC: a type field and potentially a context.
      properties: {
        '@context': { $ref: '#/definitions/contexts' },
        type: {
          oneOf: [
            {
              type: 'array',
              uniqueItems: true,
              items: { type: 'string' },
              contains: { const: W3C_CREDENTIAL_TYPE },
            },
            {
              const: W3C_CREDENTIAL_TYPE,
            },
          ],
        },
      },
      required: ['type'],
    },
    contexts: {
      oneOf: [
        {
          type: 'array',
          uniqueItem: true,
          items: [{ const: W3C_CREDENTIAL_CONTEXT_URL }],
          additionalItems: { type: 'string', format: 'uri' },
        },
        { const: W3C_CREDENTIAL_CONTEXT_URL },
      ],
    },
  },
}

// draft version '7' should align with $schema property of the schema above
const schemaValidator = new JsonSchema.Validator(presentationSchema, '7')

/**
 * Validates an object against the VerifiablePresentation data model.
 * Throws if object violates the [[presentationSchema]].
 *
 * @param presentation VerifiablePresentation or object to be validated.
 */
export function validateStructure(presentation: VerifiablePresentation): void {
  const { errors, valid } = schemaValidator.validate(presentation)
  if (!valid) {
    throw new SDKErrors.PresentationMalformedError(
      `Object not matching VerifiablePresentation data model`,
      {
        cause: errors,
      }
    )
  }
}

/**
 * Checks that an identity can act as a legitimate holder of a set of credentials and thus include them in a presentation they sign.
 * Credentials where `nonTransferable === true` and `credentialSubject.id !== holder` are disallowed and will cause this to fail.
 *
 * @param presentation A Verifiable Presentation.
 * @param presentation.holder The presentation holder's identifier.
 * @param presentation.verifiableCredential A VC or an array of VCs.
 */
export function assertHolderCanPresentCredentials({
  holder,
  verifiableCredential,
}: {
  holder: Did
  verifiableCredential: VerifiableCredential[] | VerifiableCredential
}): void {
  const credentials = Array.isArray(verifiableCredential)
    ? verifiableCredential
    : [verifiableCredential]
  credentials.forEach(({ nonTransferable, credentialSubject, id }) => {
    if (nonTransferable && credentialSubject.id !== holder)
      throw new Error(
        `The credential with id ${id} is non-transferable and cannot be presented by the identity ${holder}`
      )
  })
}

const {
  select: { byAlgorithm, byDid },
} = Signers

/**
 * Creates a Verifiable Presentation from one or more Verifiable Credentials, then signs it.
 *
 * @param args Object holding all function arguments.
 * @param args.credentials Array of one or more Verifiable Credentials.
 * @param args.holder The DID or DID Document of the holder of the credentials in the presentation, which also signs the presentation.
 * The DID Document will be resolved by this function if not passed in.
 * @param args.signers One or more signers associated with the `holder` to be used for signing the presentation.
 * If omitted, the signing step is skipped.
 * @param args.cryptosuites One or more cryptosuites that take care of processing and normalizing the presentation document.
 * The actual suite used will be based on a match between `algorithm`s supported by the `signers` and the suite's `requiredAlgorithm`.
 * @param args.proofPurpose Controls the `proofPurpose` property and which verificationMethods can be used for signing.
 * Defaults to 'authentication'.
 * @param args.validFrom A Date or date-time string indicating the earliest point in time where the presentation becomes valid.
 * Represented as `issuanceDate` on the presentation.
 * @param args.validUntil A Date or date-time string indicating when the presentation is no longer valid.
 * Represented as `expirationDate` on the presentation.
 * @param args.verifier Identifier (e.g., DID) of the verifier to prevent unauthorized re-use of the presentation.
 * @param args.challenge A challenge supplied by the verifier in a challenge-response protocol, which allows verifiers to assure presentation freshness, preventing unauthorized re-use.
 * @param args.domain - A domain string to be included in the proof, if any.
 * @returns A Verifiable Presentation containing the original VCs with its proofs.
 * If no `signers` are given, the presentation is left unsigned.
 */
export async function create({
  credentials,
  holder,
  validFrom,
  validUntil,
  verifier,
  signers,
  cryptosuites = [eddsaSuite, ecdsaSuite, sr25519Suite],
  proofPurpose = 'authentication',
  challenge,
  domain,
}: {
  credentials: VerifiableCredential[]
  holder: Did | DidDocument
  signers?: readonly SignerInterface[]
  verifier?: string
  validFrom?: Date | string
  validUntil?: Date | string
  cryptosuites?: ReadonlyArray<CryptoSuite<any>>
  proofPurpose?: string
  challenge?: string
  domain?: string
}): Promise<VerifiablePresentation> {
  const holderDid = typeof holder === 'string' ? holder : holder.id

  const verifiableCredential =
    credentials.length === 1 ? credentials[0] : credentials
  const presentation: VerifiablePresentation = {
    '@context': [W3C_CREDENTIAL_CONTEXT_URL],
    type: [W3C_PRESENTATION_TYPE],
    verifiableCredential,
    holder: holderDid,
  }
  if (typeof validFrom !== 'undefined') {
    presentation.issuanceDate = new Date(validFrom).toISOString()
  }
  if (typeof validUntil !== 'undefined') {
    presentation.expirationDate = new Date(validUntil).toISOString()
  }
  if (typeof verifier === 'string') {
    presentation.verifier = verifier
  }

  validateStructure(presentation)
  assertHolderCanPresentCredentials(presentation)

  if (!signers) {
    return presentation
  }

  const holderDocument =
    typeof holder === 'string' ? (await resolve(holder)).didDocument : holder

  if (!holderDocument?.id) {
    throw new SDKErrors.DidNotFoundError(
      `Failed to resolve holder DID ${holderDid}`
    )
  }

  const requiredAlgorithms = cryptosuites.map(
    ({ requiredAlgorithm }) => requiredAlgorithm
  )

  const signer = await Signers.selectSigner(
    signers,
    byAlgorithm(requiredAlgorithms),
    byDid(holderDocument, {
      verificationRelationship: proofPurpose,
      controller: holderDid,
    })
  )
  if (!signer) {
    throw new SDKErrors.NoSuitableSignerError(undefined, {
      signerRequirements: {
        algorithm: requiredAlgorithms,
        did: holderDid,
        verificationRelationship: proofPurpose,
      },
      availableSigners: signers,
    })
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We've matched the suite to the algorithms earlier, so this will return the right suite
  const suite = cryptosuites.find(
    ({ requiredAlgorithm }) => requiredAlgorithm === signer.algorithm
  )!
  return DataIntegrity.createProof(presentation, suite, signer, {
    proofPurpose,
    challenge,
    domain,
    // TODO: it's unclear what the canonical way of identifying the intended audience for the presentation should be;
    // The `verifier` claim on the presentation or the `domain` option on the proof.
  })
}

async function verifyPresentation(
  presentation: VerifiablePresentation,
  {
    now,
    tolerance,
    challenge,
    verifier,
    domain,
    cryptosuites,
  }: {
    now: Date
    tolerance: number
    cryptosuites: Array<CryptoSuite<any>>
    challenge?: string
    domain?: string
    verifier?: string
  }
): Promise<VerifyPresentationResult['presentationResult']> {
  const result: VerifyPresentationResult['presentationResult'] = {
    verified: false,
    results: [],
  }
  const errors: string[] = []
  try {
    validateStructure(presentation)
    if (presentation.verifier && verifier !== presentation.verifier) {
      errors.push(
        'presentation.verifier is set but does not match the verifier option'
      )
    }
    if (
      presentation.issuanceDate &&
      Date.parse(presentation.issuanceDate) > now.getTime() + tolerance
    ) {
      errors.push('presentation.issuanceDate > now')
    }
    if (
      presentation.expirationDate &&
      Date.parse(presentation.expirationDate) < now.getTime() - tolerance
    ) {
      errors.push('presentation.expirationDate < now')
    }

    assertHolderCanPresentCredentials(presentation)

    if (errors.length === 0) {
      const proof = getProof(presentation)
      try {
        const verified = await DataIntegrity.verifyProof(
          presentation,
          proof as DataIntegrity.DataIntegrityProof,
          {
            cryptosuites,
            domain,
            challenge,
            expectedController: presentation.holder,
            tolerance,
            now,
          }
        )
        result.results = [{ verified, proof }]
      } catch (proofError) {
        const errorStr = String(proofError)
        result.results = [{ verified: false, error: [errorStr], proof }]
        errors.push(errorStr)
      }

      result.verified = result.results.every(({ verified }) => verified)
    }
    if (errors.length === 0) {
      result.error = undefined
    } else {
      result.error = errors
      result.verified = false
    }
  } catch (e) {
    errors.push(String(e))
    result.verified = false
    result.error = errors
  }
  return result
}

async function verifyCredential(
  credential: VerifiableCredential
): Promise<VerifyCredentialResult> {
  let proof
  try {
    proof = getProof(credential)
    await KiltAttestationProofV1.verify(
      credential as KiltCredentialV1,
      proof as Types.KiltAttestationProofV1
    )
    return {
      verified: true,
      credential,
      results: [{ verified: true, proof }],
    }
  } catch (error) {
    return {
      verified: false,
      credential,
      error: [String(error)],
      results: proof
        ? [{ verified: false, error: [String(error)], proof }]
        : [],
    }
  }
}

async function checkStatus(
  credential: VerifiableCredential
): Promise<VerificationResult> {
  try {
    await KiltRevocationStatusV1.check(credential as KiltCredentialV1)
    return { verified: true }
  } catch (e) {
    return { verified: false, error: [String(e)] }
  }
}

/**
 * Verifies a given Verifiable Presentation and its associated Verifiable Credentials.
 *
 * This function:
 * - Verifies the integrity of the presentation by verifying the embedded data integrity proofs.
 * - If the presentation is valid, verifies each associated credential.
 * - Checks the status of each verified credential.
 * - Returns a composite verification result for the presentation and each credential.
 *
 * @param presentation - The Verifiable Presentation to be verified.
 * @param options - Verification options.
 * @param options.now - The reference time for verification as Date (default is current time).
 * @param options.challenge - The expected challenge value for the presentation, if any.
 * @param options.domain - Expected domain for the proof. Verification fails if mismatched.
 * @param options.cryptosuites - Array of cryptographic suites to use during verification (default includes suites for `sr25519-jcs-2023`, `eddsa-jcs-2022`, and `es256k-jcs-2023`).
 * @param options.verifier - The expected verifier for the presentation, if any. This is set as the proof `domain` as well.
 * @param options.tolerance - The allowed time drift in milliseconds for time-sensitive checks (default is 0).
 *
 * @returns An object representing the verification results of the presentation and each associated credential.
 */
export async function verify(
  presentation: VerifiablePresentation,
  {
    now = new Date(),
    tolerance = 0,
    cryptosuites = [sr25519Suite, eddsaSuite, ecdsaSuite],
    challenge,
    domain,
    verifier,
  }: {
    now?: Date
    challenge?: string
    domain?: string
    cryptosuites?: Array<CryptoSuite<any>>
    verifier?: string
    tolerance?: number
  } = {}
): Promise<VerifyPresentationResult> {
  let presentationResult: VerifyPresentationResult['presentationResult'] = {
    verified: false,
    error: [],
    results: [],
  }
  let credentialResults: VerifyPresentationResult['credentialResults'] = []
  try {
    presentationResult = await verifyPresentation(presentation, {
      now,
      challenge,
      verifier,
      tolerance,
      cryptosuites,
      domain,
    })

    if (presentationResult.verified !== true) {
      return {
        verified: false,
        error: presentationResult.error,
        presentationResult,
        credentialResults: [],
      }
    }
    const credentials = Array.isArray(presentation.verifiableCredential)
      ? presentation.verifiableCredential
      : [presentation.verifiableCredential]

    credentialResults = await Promise.all(
      credentials.map((credential) => verifyCredential(credential))
    )

    await Promise.all(
      credentials.map(async (credential, i) => {
        if (credentialResults[i].verified) {
          const statusResult = await checkStatus(credential)
          credentialResults[i].statusResult = statusResult
          if (statusResult.verified !== true) {
            credentialResults[i].verified = false
          }
        }
      })
    )
  } catch (e) {
    if (presentationResult.error) {
      presentationResult.error.push(String(e))
    } else {
      presentationResult.error = [String(e)]
    }
    presentationResult.verified = false
  }
  const verified =
    presentationResult.verified === true &&
    credentialResults.every((result) => result.verified === true)
  const error = [
    ...(presentationResult.error ?? []),
    ...credentialResults.flatMap((result) => [
      ...(result.error ?? []),
      ...(result.statusResult?.error ?? []),
    ]),
  ]
  return {
    verified,
    presentationResult,
    credentialResults,
    ...(error.length === 0 ? undefined : { error }),
  }
}

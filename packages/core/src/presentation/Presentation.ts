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
} from '../credentialsV1/constants.js'
import {
  KiltAttestationProofV1,
  KiltRevocationStatusV1,
  Types,
} from '../credentialsV1/index.js'
import type {
  KiltCredentialV1,
  VerifiableCredential,
  VerifiablePresentation,
} from '../credentialsV1/types.js'
import {
  DataIntegrityProof,
  createProof,
  verifyProof,
} from './DataIntegrity.js'

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
 * @param args.cryptosuites One or more cryptosuites that take care of processing and normalizing the presentation document. The actual suite used will be based on a match between `algorithm`s supported by the `signers` and the suite's `requiredAlgorithm`.
 * @param args.purpose Controls the `proofPurpose` property and which verificationMethods can be used for signing.
 * Defaults to 'authentication'.
 * @param args.validFrom A Date or date-time string indicating the earliest point in time where the presentation becomes valid.
 * Represented as `issuanceDate` on the presentation.
 * @param args.validUntil A Date or date-time string indicating when the presentation is no longer valid.
 * Represented as `expirationDate` on the presentation.
 * @param args.verifier Identifier (e.g., DID) of the verifier to prevent unauthorized re-use of the presentation.
 * @param args.challenge A challenge supplied by the verifier in a challenge-response protocol, which allows verifiers to assure presentation freshness, preventing unauthorized re-use.
 * @returns A Verifiable Presentation containing the original VCs with its proofs.
 * If no `signers` are given, the presentation is unsigned.
 */
export async function create({
  credentials,
  holder,
  validFrom,
  validUntil,
  verifier,
  signers,
  cryptosuites = [eddsaSuite, ecdsaSuite, sr25519Suite],
  purpose = 'authentication',
  challenge,
}: {
  credentials: VerifiableCredential[]
  holder: Did | DidDocument
  signers?: readonly SignerInterface[]
  verifier?: string
  validFrom?: Date | string
  validUntil?: Date | string
  cryptosuites?: ReadonlyArray<CryptoSuite<any>>
  purpose?: string
  challenge?: string
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
      verificationRelationship: purpose,
      controller: holderDid,
    })
  )
  if (!signer) {
    throw new SDKErrors.NoSuitableSignerError(undefined, {
      signerRequirements: {
        algorithm: requiredAlgorithms,
        did: holderDid,
        verificationRelationship: purpose,
      },
      availableSigners: signers,
    })
  }
  const suite = cryptosuites.find(
    ({ requiredAlgorithm }) => requiredAlgorithm === signer.algorithm
  )! // We've matched the suite to the algorithms earlier, so this will return the right suite
  return createProof(presentation, suite, signer, {
    purpose,
    challenge,
    // domain: verifier,
  })
}

type VerificationResult = {
  verified: boolean
  errors?: string[]
}
type PresentationResult = VerificationResult & {
  presentation: VerificationResult
  credentials: Array<VerificationResult & { status?: VerificationResult }>
}

/**
 * @param presentation
 * @param root0
 * @param root0.now
 * @param root0.domain
 * @param root0.challenge
 * @param root0.verifier
 * @param root0.tolerance
 */
export async function verify(
  presentation: VerifiablePresentation,
  {
    now = Date.now(),
    tolerance = 0,
    domain,
    challenge,
    verifier,
  }: {
    now?: number
    domain?: string
    challenge?: string
    verifier?: string
    tolerance?: number
  } = {}
): Promise<PresentationResult> {
  const presentationResult: Required<VerificationResult> = {
    verified: true,
    errors: [],
  }
  try {
    validateStructure(presentation)
    if (presentation.verifier && verifier !== presentation.verifier) {
      presentationResult.errors.push(
        'presentation.verifier is set but does not match the verifier option'
      )
    }
    if (
      presentation.issuanceDate &&
      Date.parse(presentation.issuanceDate) > now + tolerance
    ) {
      presentationResult.errors.push('presentation.issuanceDate > now')
    }
    if (
      presentation.expirationDate &&
      Date.parse(presentation.expirationDate) < now - tolerance
    ) {
      presentationResult.errors.push('presentation.expirationDate < now')
    }
    const proofs = (
      Array.isArray(presentation.proof)
        ? presentation.proof
        : [presentation.proof]
    ) as DataIntegrityProof[]
    const results = await Promise.allSettled(
      proofs.map((proof) =>
        verifyProof(
          { ...presentation, proof },
          {
            cryptosuites: [sr25519Suite, eddsaSuite, ecdsaSuite],
            domain,
            challenge,
            expectedController: presentation.holder,
          }
        )
      )
    )
    if (!results.some((r) => r.status === 'fulfilled' && r.value === true)) {
      presentationResult.verified = false
      results.forEach((r, idx) => {
        if (r.status === 'rejected' && Boolean(r.reason)) {
          presentationResult.errors.push(`proof[${idx}]: ${String(r.reason)}`)
        }
      })
    }
    assertHolderCanPresentCredentials(presentation)
  } catch (e) {
    presentationResult.errors.push(String(e))
  }
  if (presentationResult.errors.length > 0) {
    presentationResult.verified = false
  }
  if (presentationResult.verified !== true) {
    return {
      verified: false,
      errors: presentationResult.errors,
      presentation: presentationResult,
      credentials: [],
    }
  }
  const credentials = Array.isArray(presentation.verifiableCredential)
    ? presentation.verifiableCredential
    : [presentation.verifiableCredential]

  const credentialResults = await Promise.all(
    credentials.map(async ({ proof, ...credential }) => {
      const proofs = Array.isArray(proof) ? proof : [proof]
      const proofResult = await Promise.allSettled(
        proofs.map((p) =>
          KiltAttestationProofV1.verify(
            credential as KiltCredentialV1,
            p as Types.KiltAttestationProofV1
          )
        )
      )
      if (proofResult.some((r) => r.status === 'fulfilled') !== true) {
        return {
          verified: false,
          errors: proofResult.reduce<string[]>((errors, r, idx) => {
            if (r.status === 'rejected' && Boolean(r.reason)) {
              errors.push(`proof[${idx}]: ${String(r.reason)}`)
            }
            return errors
          }, []),
        }
      }
      const status: VerificationResult = {
        verified: true,
      }
      try {
        await KiltRevocationStatusV1.check(credential as KiltCredentialV1)
      } catch (e) {
        status.verified = false
        status.errors = status.errors
          ? [...status.errors, String(e)]
          : [String(e)]
      }
      return { verified: true, status }
    })
  )
  const verified =
    presentationResult.verified === true &&
    credentialResults.every((result) => result.verified === true)
  const errors = [
    ...presentationResult.errors,
    ...credentialResults.flatMap((result) => [
      ...(result.errors ?? []),
      ...(result.status?.errors ?? []),
    ]),
  ]
  return {
    verified,
    errors: errors.length > 0 ? errors : undefined,
    presentation: presentationResult,
    credentials: credentialResults,
  }
}

/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { CryptoSuite } from '@kiltprotocol/jcs-data-integrity-proofs-common'

import { resolve } from '@kiltprotocol/did'
import type { Did, DidDocument, ICType } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import {
  KiltAttestationProofV1,
  KiltCredentialV1,
  KiltRevocationStatusV1,
} from './V1/index.js'
import type {
  VerifiableCredential,
  VerifiablePresentation,
} from './V1/types.js'
import { type CTypeLoader } from './ctype/index.js'
import type {
  CredentialStatusResult,
  VerifyCredentialResult,
  VerifyPresentationResult,
} from './interfaces.js'
import { verifyPresentationProof } from './presentation/Presentation.js'
import * as DataIntegrity from './proofs/DataIntegrity.js'
import { appendErrors, getProof, toError } from './proofs/utils.js'

/**
 * Retrieves status information on a credential, indicating for example whether or not the credential has been revoked.
 * After a credential has been verified using {@link verifyCredential} or {@link verifyPresentation}, this function could be called periodically to ensure it continues to be valid.
 *
 * @param credential The Verifiable Credential whose status is to be checked.
 * @returns An object containing a summary of the result (`verified`) as a boolean alongside any potential errors.
 * A `status` string may convey additional information on the credential's status.
 */
export async function checkStatus(
  credential: VerifiableCredential
): Promise<CredentialStatusResult> {
  try {
    switch (credential.credentialStatus?.type) {
      case KiltRevocationStatusV1.STATUS_TYPE:
        await KiltRevocationStatusV1.check(
          credential as KiltCredentialV1.Interface
        )
        return { verified: true }
      default:
        throw new SDKErrors.CredentialUnverifiableError(
          `Unknown credentialStatus type ${credential.credentialStatus?.type}`
        )
    }
  } catch (error) {
    return { verified: false, error: [toError(error)] }
  }
}

/**
 * Verifies a Verifiable Credential and checks its revocation status.
 *
 * This function:
 * - Verifies the integrity and authenticity of the data contained in the credential by verifying its `proof`.
 * - Checks the revocation status of a verified credential.
 * - Returns a verification result containing proof and status verification results.
 *
 * @param credential - The Verifiable Credential to be verified.
 * @param verificationCriteria - Verification options.
 * @param verificationCriteria.proofTypes - The types of acceptable proofs on the presentation.
 * Defaults to {@link KiltAttestationProofV1.PROOF_TYPE KiltAttestationProofV1 } which, as of now, is the only type suppported.
 * @param verificationCriteria.proofPurpose - Controls which value is expected for the proof's `proofPurpose` property.
 * As {@link KiltAttestationProofV1.PROOF_TYPE KiltAttestationProofV1} proofs default to `assertionMethod`, any other value will currently fail verification.
 * @param verificationCriteria.now - The reference time for verification as Date (default is current time).
 * @param verificationCriteria.tolerance - The allowed time drift in milliseconds for time-sensitive checks (default is 0).
 * @param config - Additional configuration (optional).
 * @param config.didResolver - An alterative DID resolver to resolve issuer DIDs (defaults to {@link resolve}).
 * An array of static DID documents can be provided instead, in which case the function will not try to retrieve any DID documents from a remote source.
 * @param config.ctypeLoader - An alternative CType loader that retrieves CType definitions associated with the credential in order to assure they follow the CType's credential schema.
 * An array of CType definitions can be passed instead, which has the effect of restricting allowable credential types to these known CTypes.
 * By default, this retrieves CType defitions from the KILT blockchain, using a loader with an internal definitions cache.
 * @param config.credentialStatusLoader - An alternative credential status resolver.
 * This function takes the credential as input and is expected to return a promise of an {@link CredentialStatusResult}.
 * Defaults to {@link checkStatus}.
 * @returns An object containing a summary of the result (`verified`) as a boolean alongside any potential errors and detailed information on proof verification results and credential status.
 */
export async function verifyCredential(
  credential: VerifiableCredential,
  verificationCriteria: {
    proofTypes?: string[]
    proofPurpose?: string
    now?: Date
    tolerance?: number
  } = {},
  config: {
    didResolver?: typeof resolve | DidDocument[]
    ctypeLoader?: CTypeLoader | ICType[]
    credentialStatusLoader?: (
      credential: VerifiableCredential
    ) => Promise<CredentialStatusResult>
  } = {}
): Promise<VerifyCredentialResult> {
  const result: VerifyCredentialResult = {
    verified: false,
  }
  const { now = new Date(), tolerance = 0 } = verificationCriteria
  try {
    // TODO: time-based checks could also happen on checkStatus, as they should be re-run when re-checking a credentials validity.
    if (Date.parse(credential.issuanceDate) - tolerance > now.getTime()) {
      throw new SDKErrors.CredentialUnverifiableError(
        `issuanceDate is later than 'now'`
      )
    }

    const proof = getProof(credential)
    result.proofResults = [{ verified: false, proof }]
    try {
      const { proofTypes, proofPurpose } = verificationCriteria
      if (proofTypes && !proofTypes.includes(proof.type)) {
        throw new SDKErrors.CredentialUnverifiableError(
          `Proof type ${proof.type} not in allowed proofTypes ${proofTypes}`
        )
      }

      switch (proof.type) {
        case KiltAttestationProofV1.PROOF_TYPE:
          {
            if (proofPurpose && proofPurpose !== 'assertionMethod') {
              throw new SDKErrors.CredentialUnverifiableError(
                `proofPurpose does not match default purpose for ${KiltAttestationProofV1.PROOF_TYPE} (assertionMethod)`
              )
            }

            const { ctypeLoader } = config
            const options: Parameters<typeof KiltAttestationProofV1.verify>[2] =
              {}
            if (Array.isArray(ctypeLoader)) {
              options.cTypes = ctypeLoader
              options.loadCTypes = false
            } else if (typeof ctypeLoader === 'function') {
              options.loadCTypes = ctypeLoader
            }
            await KiltAttestationProofV1.verify(
              credential as KiltCredentialV1.Interface,
              proof as KiltAttestationProofV1.Interface,
              options
            )
            result.proofResults[0].verified = true
          }
          break
        default:
          throw new SDKErrors.CredentialUnverifiableError(
            `Unsupported proof type ${proof.type}`
          )
      }
    } catch (error) {
      result.proofResults[0].verified = false
      appendErrors(result.proofResults[0], toError(error))
    }
    if (result.proofResults?.some(({ verified }) => verified === true)) {
      const { credentialStatusLoader = checkStatus } = config
      // TODO: shouldn't the 'now' parameter also apply to the status check?
      result.statusResult = await credentialStatusLoader(credential).catch(
        (e) => ({ verified: false, error: [toError(e)] })
      )

      if (result.statusResult.verified === true) {
        result.verified = true
      }
    }
  } catch (error) {
    appendErrors(result, toError(error))
    result.verified = false
  }
  appendErrors(
    result,
    ...(result.proofResults?.flatMap((r) => r.error ?? []) ?? []),
    ...(result.statusResult?.error ?? [])
  )
  if (result.error?.length === 0) {
    delete result.error
  }
  if (typeof result.error !== 'undefined') {
    result.verified = false
  }
  return result
}

/**
 * Verifies a Verifiable Presentation and the Verifiable Credentials contained within.
 *
 * This function:
 * - Verifies the integrity of the presentation by verifying the embedded data integrity proofs.
 * - If the presentation is valid, verifies each associated credential.
 * - Checks the status of each verified credential.
 * - Returns a composite verification result for the presentation and each credential.
 *
 * @param presentation - The Verifiable Presentation to be verified.
 * @param verificationCriteria - Verification options.
 * @param verificationCriteria.now - The reference time for verification as Date (default is current time).
 * @param verificationCriteria.tolerance - The allowed time drift in milliseconds for time-sensitive checks (default is 0).
 * @param verificationCriteria.credentials - Verification criteria to be passed on to {@link verifyCredential}.
 * @param verificationCriteria.credentials.proofTypes See {@link verifyCredential}.
 * @param verificationCriteria.credentials.proofPurpose See {@link verifyCredential}.
 * @param verificationCriteria.presentation - Verification criteria for presentation verification.
 * @param verificationCriteria.presentation.proofTypes - The types of acceptable proofs on the presentation.
 * Defaults to {@link DataIntegrity.PROOF_TYPE DataIntegrityProof } which, as of now, is the only type suppported.
 * Any other values will be mapped to a known algorithm or cryptosuite for use with this proof type, thus allowing to control the signature algorithm to be used.
 * @param verificationCriteria.presentation.proofPurpose - Controls which value is expected for the proof's `proofPurpose` property.
 * If specified, verification fails if the proof is issued for a different purpose.
 * @param verificationCriteria.presentation.challenge - The expected challenge value for the presentation, if any.
 * If given, verification fails if the proof does not contain the challenge value.
 * @param verificationCriteria.presentation.domain - Expected domain for the proof. Verification fails if mismatched.
 * @param verificationCriteria.presentation.verifier - The expected verifier for the presentation, if any.
 * @param config - Additional configuration (optional).
 * @param config.didResolver - An alterative DID resolver to resolve the holder- and issuer DIDs (defaults to {@link resolve}).
 * An array of static DID documents can be provided instead, in which case the function will not try to retrieve any DID documents from a remote source.
 * @param config.ctypeLoader - An alternative CType loader for credential verification, or alternatively an array of CTypes.
 * See {@link verifyCredential} for details.
 * @param config.credentialStatusLoader - An alternative credential status resolver.
 * See {@link verifyCredential} for details.
 * @returns An object containing a summary of the result (`verified`) as a boolean alongside detailed information on presentation and credential verification results.
 */
export async function verifyPresentation(
  presentation: VerifiablePresentation,
  verificationCriteria: {
    now?: Date
    tolerance?: number
    credentials?: {
      proofTypes?: string[]
      proofPurpose?: string
    }
    presentation?: {
      proofTypes?: string[]
      proofPurpose?: string
      challenge?: string
      domain?: string
      verifier?: Did
    }
  } = {},
  config: {
    didResolver?: typeof resolve | DidDocument[]
    ctypeLoader?: CTypeLoader | ICType[]
    credentialStatusLoader?: (
      credential: VerifiableCredential
    ) => Promise<CredentialStatusResult>
  } = {}
): Promise<VerifyPresentationResult> {
  const result: VerifyPresentationResult = {
    verified: false,
  }
  try {
    const {
      now = new Date(),
      tolerance = 0,
      presentation: { proofTypes: presentationProofTypes } = {},
    } = verificationCriteria
    const { ctypeLoader, credentialStatusLoader } = config
    // prepare did resolver to be used for loading issuer & holder did documents
    let { didResolver = resolve } = config
    if (Array.isArray(didResolver)) {
      const knownDocuments = new Map(
        didResolver.map((document) => {
          return [document.id, document]
        })
      )
      didResolver = async (did) => {
        const didDocument = knownDocuments.get(did)
        const didResolutionMetadata = didDocument
          ? {}
          : ({ error: 'notFound' } as const)
        return {
          didDocument,
          didResolutionMetadata,
          didDocumentMetadata: {},
        }
      }
    }
    // verify presentation proof
    let cryptosuites: Array<CryptoSuite<any>> | undefined
    // If presentation.proofTypes is set, we choose a set of cryptosuites based on that value.
    // We leave `cryptosuites` unset otherwise, resulting in the default set of suites being used in verification.
    if (presentationProofTypes) {
      cryptosuites = presentationProofTypes.map((proofType) => {
        const suite = DataIntegrity.getCryptosuiteByNameOrAlgorithm(proofType)
        if (!suite) {
          throw new Error(
            `could not match proofTypes value ${presentationProofTypes} to a known proof type or cryptosuite`
          )
        }
        return suite
      })
    }

    const { verified, proofResults, error } = await verifyPresentationProof(
      presentation,
      {
        ...verificationCriteria.presentation,
        now,
        cryptosuites,
        didResolver,
      }
    )

    result.proofResults = proofResults
    result.verified = verified
    if (error) {
      result.error = error
    }
    // return early if the presentation proof can't be verified
    if (verified !== true) {
      return result
    }
    // retrieve credential(s) from presentation body
    const credentials = Array.isArray(presentation.verifiableCredential)
      ? presentation.verifiableCredential
      : [presentation.verifiableCredential]
    // verify each credential (including proof & status)
    result.credentialResults = await Promise.all(
      credentials.map(async (credential) => {
        const credentialResult = await verifyCredential(
          credential,
          { ...verificationCriteria.credentials, now, tolerance },
          { credentialStatusLoader, ctypeLoader, didResolver }
        )
        return { ...credentialResult, credential }
      })
    )
    // carry credential results to result summary
    result.credentialResults.forEach((r) => {
      if (result.verified && r.verified !== true) {
        result.verified = false
      }
      if (Array.isArray(r.error)) {
        appendErrors(result, ...r.error)
      }
    })
  } catch (e) {
    appendErrors(result, toError(e))
    result.verified = false
  }
  // make sure we don't have an empty error array
  if (result.error?.length === 0) {
    delete result.error
  }
  return result
}

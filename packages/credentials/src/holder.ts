/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import jsonpointer from 'json-pointer'
import type { CryptoSuite } from '@kiltprotocol/jcs-data-integrity-proofs-common'

import { Did } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { signersForDid } from '@kiltprotocol/did'

import { KiltAttestationProofV1, KiltCredentialV1 } from './V1/index.js'
import { VerifiableCredential, VerifiablePresentation } from './V1/types.js'
import { HolderOptions } from './interfaces.js'
import * as Presentation from './presentation/index.js'
import * as DataIntegrity from './proofs/DataIntegrity.js'
import { getProof } from './proofs/utils.js'

function pointerToAttributeName(
  credential: VerifiableCredential,
  pointer: string,
  throwIfMandatory = false
): string {
  const parsed = jsonpointer.parse(pointer)
  if (jsonpointer.has(credential, parsed) !== true) {
    throw new SDKErrors.SDKError(`No value at pointer ${pointer}`)
  }
  const [topLevel, property, ...rest] = parsed
  if (
    topLevel !== 'credentialSubject' ||
    typeof property === 'undefined' ||
    rest.length !== 0
  ) {
    throw new SDKErrors.SDKError(
      `Selective disclosure not enabled for attribute ${pointer}. Pointers should follow the pattern '/credentialSubject/{attribute}' as for this proof type, selective disclosure is enabled only for top-level properties of 'credentialSubject'.`
    )
  }
  if (property === 'id' || property === '@context') {
    if (throwIfMandatory) {
      throw new SDKErrors.SDKError(
        `Mandatory attribute cannot be hidden (${pointer})`
      )
    }
    return property
  }
  return String(property)
}

/**
 * Allows creating derivative proofs from a Verifiable Credential, for the purpose of disclosing only a subset of the credential's claims to a verifier.
 *
 * @param params Holds all named parameters.
 * @param params.credential A Verifiable Credential containing a proof.
 * @param params.proofOptions Options for creating the derived proof.
 * @param params.proofOptions.includeClaims An array of {@link https://www.rfc-editor.org/info/rfc6901 JSON Pointer} expressions.
 * Allows selecting which claims/attributes in the credential should be disclosed, hiding all other (non-mandatory) attributes.
 * @param params.proofOptions.excludeClaims An array of {@link https://www.rfc-editor.org/info/rfc6901 JSON Pointer} expressions selecting attributes to be hidden.
 * This means that all other properties are being revealed.
 * Selecting mandatory properties will result in an error.
 * _Ignored if `includeClaims` is set_.
 * @returns A copy of the original credential and proof, altered according to the derivation rules and `proofOptions`.
 */
export async function deriveProof({
  credential,
  proofOptions = {},
}: {
  credential: VerifiableCredential
  proofOptions?: {
    includeClaims?: string[]
    excludeClaims?: string[]
  }
}): Promise<VerifiableCredential> {
  const proof = getProof(credential)
  switch (proof.type) {
    case KiltAttestationProofV1.PROOF_TYPE: {
      KiltCredentialV1.validateStructure(
        credential as KiltCredentialV1.Interface
      )

      const { includeClaims, excludeClaims } = proofOptions
      let discloseProps: string[] = []
      if (includeClaims) {
        const attributes = new Set<string>()
        includeClaims.forEach((path) => {
          attributes.add(pointerToAttributeName(credential, path, false))
        })
        discloseProps = Array.from(attributes)
      } else if (excludeClaims) {
        const attributes = new Set<string>(
          Object.keys(credential.credentialSubject)
        )
        excludeClaims.forEach((path) => {
          attributes.delete(pointerToAttributeName(credential, path, true))
        })
        discloseProps = Array.from(attributes)
      } else {
        return { ...credential }
      }
      const derived = KiltAttestationProofV1.applySelectiveDisclosure(
        credential as KiltCredentialV1.Interface,
        proof as KiltAttestationProofV1.Interface,
        discloseProps
      )
      return { ...derived.credential, proof: derived.proof }
    }
    default:
      throw new SDKErrors.SDKError(
        `Only proof type ${KiltAttestationProofV1.PROOF_TYPE} is currently supported.`
      )
  }
}

/**
 * Creates a Verifiable Presentation from one or more credentials and adds a proof for the purpose of holder authentication.
 * To that end, the presentation can be scoped to a specific transaction, timeframe, purpose, or verifier, by means of multiple mechanisms.
 *
 * @param params Holds all named parameters.
 * @param params.credentials Array of one or more Verifiable Credentials to be included in the presentation.
 * @param params.holder Interfaces for interacting with the holder identity for the purpose of generating a presentation proof.
 * @param params.holder.didDocument The DID Document of the holder.
 * @param params.holder.signers An array of signer interfaces, each allowing to request signatures made with a key associated with the holder DID Document.
 * The function will select the first signer that matches requirements around signature algorithm and relationship of the key to the DID as given by the DID Document.
 * @param params.presentationOptions Object holding optional arguments for scoping the presentation.
 * @param params.presentationOptions.validFrom A Date or date-time string indicating the earliest point in time where the presentation becomes valid.
 * Represented as `issuanceDate` on the presentation.
 * Defaults to `params.now`.
 * @param params.presentationOptions.validUntil A Date or date-time string indicating when the presentation is no longer valid.
 * Represented as `expirationDate` on the presentation.
 * @param params.presentationOptions.verifier Identifier (DID) of the verifier to prevent unauthorized re-use of the presentation.
 * @param params.proofOptions Object holding optional arguments for creating and scoping the presentation proof.
 * @param params.proofOptions.proofPurpose Controls the `proofPurpose` property and consequently which verificationMethods can be used for signing.
 * @param params.proofOptions.proofType Controls the type of proof to be created for the presentation.
 * Currently, this function only produces {@link DataIntegrity.PROOF_TYPE DataIntegrityProof} type proofs;
 * Any other values will be mapped to a known algorithm or cryptosuite for use with this proof type, thus allowing to control the signature algorithm to be used.
 * @param params.proofOptions.challenge A challenge supplied by a verifier in a challenge-response protocol, which allows verifiers to assure signature freshness, preventing unauthorized re-use.
 * @param params.proofOptions.domain A domain string to be included in the proof.
 * This plays a role similar to the `verifier` option, but is not restricted to DIDs.
 * This could, for example, be the domain of a web-application requesting credential presentation.
 * @param params.now Allows manipulating the current date and time for the purpose of presentation & proof generation.
 * Defaults to the current date and time.
 * @returns A holder-signed presentation.
 */
export async function createPresentation({
  credentials,
  holder,
  presentationOptions = {},
  proofOptions = {},
  now,
}: {
  credentials: VerifiableCredential[]
  holder: HolderOptions
  presentationOptions?: {
    validFrom?: Date
    validUntil?: Date
    verifier?: Did
  }
  proofOptions?: {
    proofPurpose?: string
    proofType?: string
    challenge?: string
    domain?: string
  }
  now?: Date
}): Promise<VerifiablePresentation> {
  const { didDocument, signers } = holder
  const { validFrom, validUntil, verifier } = presentationOptions
  const { proofPurpose, proofType, challenge, domain } = proofOptions

  let presentation = await Presentation.create({
    credentials,
    holder: didDocument.id,
    validFrom: validFrom ?? now,
    validUntil,
    verifier,
  })

  let cryptosuites: Array<CryptoSuite<any>> | undefined
  if (proofType) {
    const suite = DataIntegrity.getCryptosuiteByNameOrAlgorithm(proofType)
    if (!suite) {
      throw new Error(
        `could not match proofType ${proofType} to a known proof type or cryptosuite`
      )
    }
    cryptosuites = [suite]
  }

  presentation = await DataIntegrity.signWithDid({
    document: presentation,
    signerDid: didDocument,
    signers: await signersForDid(didDocument, ...signers),
    proofPurpose,
    challenge,
    domain,
    created: now,
    expires: validUntil,
    cryptosuites,
  })

  return presentation
}

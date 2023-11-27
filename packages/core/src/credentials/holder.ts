/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error not a ts dependency
import jsonpointer from 'json-pointer'

import { cryptosuite as eddsaSuite } from '@kiltprotocol/eddsa-jcs-2022'
import { cryptosuite as ecdsaSuite } from '@kiltprotocol/es256k-jcs-2023'
import { cryptosuite as sr25519Suite } from '@kiltprotocol/sr25519-jcs-2023'

import { Did } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as Presentation from './presentation/index.js'
import * as DataIntegrity from './proofs/DataIntegrity.js'
import { VerifiableCredential, VerifiablePresentation } from './V1/types.js'
import { HolderOptions } from './interfaces.js'
import { KiltAttestationProofV1, KiltCredentialV1 } from './V1/index.js'
import { getProof } from './proofs/utils.js'

function pointerToAttributeName(
  credential: VerifiableCredential,
  pointer: string,
  throwIfMandatory = false
): string {
  if (jsonpointer.has(credential, pointer) !== true) {
    throw new SDKErrors.SDKError(`No value at pointer ${pointer}`)
  }
  const [topLevel, property, ...rest]: Array<string | number> =
    jsonpointer.parse(credential, pointer)
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
 * @param credential A Verifiable Credential containing a proof.
 * @param proofOptions Options for creating the derived proof.
 * @param proofOptions.disclose Allows selecting which claims/attributes in the credential should be disclosed, hiding others.
 * @param proofOptions.disclose.only An array of credentialPath expressions selecting attributes to be disclosed.
 * All other (non-mandatory) attributes that can be hidden will be hidden.
 * Takes precedence over `allBut`.
 * @param proofOptions.disclose.allBut An array of credentialPath expressions selecting attributes to be hidden.
 * This means that all other properties are being revealed.
 * Selecting mandatory properties will result in an error.
 * It is ignored if `only` is set.
 * @returns A copy of the original credential and proof, altered according to the derivation rules and `proofOptions`.
 */
export async function deriveProof(
  credential: VerifiableCredential,
  // TODO: do we need a holder interface here at some point? Would be required if some holder secret would become necessary to create a derived proof, e.g., a link secret.
  proofOptions?: {
    disclose?: {
      allBut?: string[]
      only?: string[]
    }
  }
): Promise<VerifiableCredential> {
  const proof = getProof(credential)
  switch (proof.type) {
    case KiltAttestationProofV1.PROOF_TYPE: {
      KiltCredentialV1.validateStructure(
        credential as KiltCredentialV1.Interface
      )

      const { allBut, only } = proofOptions?.disclose ?? {}
      let discloseProps: string[] = []
      if (only) {
        const attributes = new Set<string>()
        only.forEach((path) => {
          attributes.add(pointerToAttributeName(credential, path, false))
        })
        discloseProps = Array.from(attributes)
      } else if (allBut) {
        const attributes = new Set<string>(
          Object.keys(credential.credentialSubject)
        )
        allBut.forEach((path) => {
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
 * @param credentials Array of one or more Verifiable Credentials to be included in the presentation.
 * @param holder Interfaces for interacting with the holder identity for the purpose of generating a presentation proof.
 * @param holder.did The Decentralized Identifier (DID) of the holder.
 * @param holder.didDocument The DID Document of the holder. If omitted, the holder DID will be resolved internally to retrieve the document.
 * @param holder.signers An array of signer interfaces, each allowing to request signatures made with a key associated with the holder DID Document.
 * The function will select the first signer that matches requirements around signature algorithm and relationship of the key to the DID as given by the DID Document.
 * @param presentationOptions Object holding optional arguments for scoping the presentation.
 * @param presentationOptions.validFrom A Date or date-time string indicating the earliest point in time where the presentation becomes valid.
 * Represented as `issuanceDate` on the presentation.
 * Defaults to `proofOptions.now`.
 * @param presentationOptions.validUntil A Date or date-time string indicating when the presentation is no longer valid.
 * Represented as `expirationDate` on the presentation.
 * @param presentationOptions.verifier Identifier (DID) of the verifier to prevent unauthorized re-use of the presentation.
 * @param proofOptions Object holding optional arguments for creating and scoping the presentation proof.
 * @param proofOptions.proofPurpose Controls the `proofPurpose` property and consequently which verificationMethods can be used for signing.
 * @param proofOptions.proofType Controls the type of proof to be created for the presentation.
 * Currently, this function only produces {@link DataIntegrity.PROOF_TYPE DataIntegrityProof} type proofs;
 * Any other values will be mapped to a known algorithm or cryptosuite for use with this proof type, thus allowing to control the signature algorithm to be used.
 * @param proofOptions.challenge A challenge supplied by a verifier in a challenge-response protocol, which allows verifiers to assure signature freshness, preventing unauthorized re-use.
 * @param proofOptions.domain A domain string to be included in the proof.
 * This plays a role similar to the `verifier` option, but is not restricted to DIDs.
 * This could, for example, be the domain of a web-application requesting credential presentation.
 * @param proofOptions.now Allows manipulating the current date and time for the purpose of presentation & proof generation.
 * Defaults to the current date and time.
 * @returns A holder-signed presentation.
 */
export async function createPresentation(
  credentials: VerifiableCredential[],
  holder: HolderOptions,
  presentationOptions: {
    validFrom?: Date
    validUntil?: Date
    verifier?: Did
  } = {},
  proofOptions: {
    proofPurpose?: string
    proofType?: string
    challenge?: string
    domain?: string
    now?: Date
  } = {}
): Promise<VerifiablePresentation> {
  const { did, didDocument, signers } = holder
  const { validFrom, validUntil, verifier } = presentationOptions
  const { proofPurpose, proofType, challenge, domain, now } = proofOptions

  let presentation = await Presentation.create({
    credentials,
    holder: did,
    validFrom: validFrom ?? now,
    validUntil,
    verifier,
  })

  let cryptosuites = [sr25519Suite, ecdsaSuite, eddsaSuite]
  if (proofType && proofType !== DataIntegrity.PROOF_TYPE) {
    // we're being generous here, so 'ed25519' works just as well as 'eddsa-jcs-2022'
    const suite = cryptosuites.find(
      ({ requiredAlgorithm, name }) =>
        proofType === name || proofType === requiredAlgorithm
    )
    if (!suite) {
      throw new Error(
        `could not match proofType ${proofType} to a known proof type or cryptosuite`
      )
    }
    cryptosuites = [suite]
  }

  presentation = await DataIntegrity.signWithDid({
    document: presentation,
    signerDid: didDocument ?? did,
    signers,
    proofPurpose,
    challenge,
    domain,
    created: now,
    expires: validUntil,
    cryptosuites,
  })

  return presentation
}

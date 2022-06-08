/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * In KILT, a [[Credential]] is an attested claim, which a Claimer can store locally and share with Verifiers as they wish.
 *
 * Once a [[RequestForAttestation]] has been made, the [[Attestation]] can be built and the Attester submits it wrapped in a [[Credential]] object.
 * This [[Credential]] also contains the original request for attestation.
 * RequestForAttestation also exposes a [[createPresentation]] method, that can be used by the claimer to hide some specific information from the verifier for more privacy.
 *
 * @packageDocumentation
 */

import {
  DidDetails,
  Utils as DidUtils,
  DidKeySelectionCallback,
} from '@kiltprotocol/did'
import type {
  ICredential,
  CompressedCredential,
  IAttestation,
  IRequestForAttestation,
  IDidResolver,
  KeystoreSigner,
  DidVerificationKey,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { Attestation } from '../attestation/index.js'
import * as RequestForAttestation from '../requestforattestation/index.js'
import * as CredentialUtils from './Credential.utils.js'

/**
 * [STATIC] Builds a new instance of [[Credential]], from all required properties.
 *
 * @param request - The request for attestation for the claim that was attested.
 * @param attestation - The attestation for the claim by the attester.
 * @returns A new [[Credential]] object.
 * @example ```javascript
 * // create a Credential object after receiving the attestation from the attester
 * Credential.fromRequestAndAttestation(request, attestation);
 * ```
 */
export function fromRequestAndAttestation(
  request: IRequestForAttestation,
  attestation: IAttestation
): ICredential {
  const credential = {
    request,
    attestation,
  }
  CredentialUtils.errorCheck(credential)
  return credential
}

/**
 *  [STATIC] Custom Type Guard to determine input being of type ICredential using the CredentialUtils errorCheck.
 *
 * @param input The potentially only partial ICredential.
 *
 * @returns Boolean whether input is of type ICredential.
 */
export function isICredential(input: unknown): input is ICredential {
  try {
    CredentialUtils.errorCheck(input as ICredential)
  } catch (error) {
    return false
  }
  return true
}

/**
 * Verifies whether the data of the given credential is valid. It is valid if:
 * * the [[RequestForAttestation]] object associated with this credential has valid data (see [[RequestForAttestation.verifyData]]);
 * and
 * * the hash of the [[RequestForAttestation]] object for the credential, and the hash of the [[Claim]] for the credential are the same.
 *
 * @param credential - The credential to verify.
 * @returns Whether the credential's data is valid.
 * @example ```javascript
 * const verificationResult = Credential.verifyData(credential);
 * ```
 */
export function verifyData(credential: ICredential): boolean {
  if (credential.request.claim.cTypeHash !== credential.attestation.cTypeHash)
    return false
  return (
    credential.request.rootHash === credential.attestation.claimHash &&
    RequestForAttestation.verifyDataIntegrity(credential.request)
  )
}

/**
 * (ASYNC) Verifies whether the credential is valid. It is valid if:
 * * the data is valid (see [[verifyData]]);
 * and
 * * the [[Attestation]] object for this credential is valid (see [[Attestation.checkValidity]], where the **chain** is queried).
 *
 * Upon presentation of a credential, a verifier would call this [[verify]] function.
 *
 * @param credential - The credential to check for validity.
 * @param verificationOpts The additional options to use upon attested credential verification.
 * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity if it is not passed in.
 * Defaults to [[DidResolver]].
 * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
 * @returns A promise containing whether the provided credential is valid.
 * @example ```javascript
 * Credential.verify().then((isVerified) => {
 *   // `isVerified` is true if the credential is verified, false otherwise
 * });
 * ```
 */
export async function verify(
  credential: ICredential,
  verificationOpts: {
    resolver?: IDidResolver
    challenge?: string
  } = {}
): Promise<boolean> {
  return (
    verifyData(credential) &&
    (await RequestForAttestation.verifySignature(
      credential.request,
      verificationOpts
    )) &&
    Attestation.checkValidity(credential.attestation)
  )
}

/**
 *  [STATIC] Verifies the data of each element of the given Array of ICredentials.
 *
 * @param legitimations Array of ICredentials to validate.
 * @throws [[ERROR_LEGITIMATIONS_UNVERIFIABLE]] when one of the ICredentials data is unable to be verified.
 *
 * @returns Boolean whether each element of the given Array of ICredentials is verifiable.
 */
export function validateLegitimations(legitimations: ICredential[]): boolean {
  legitimations.forEach((legitimation: ICredential) => {
    if (!verifyData(legitimation)) {
      throw new SDKErrors.ERROR_LEGITIMATIONS_UNVERIFIABLE()
    }
  })
  return true
}

/**
 * Gets the hash of the claim that corresponds to this attestation.
 *
 * @param credential - The credential to get the hash from.
 * @returns The hash of the claim for this attestation (claimHash).
 */
export function getHash(credential: ICredential): IAttestation['claimHash'] {
  return credential.attestation.claimHash
}

export function getAttributes(credential: ICredential): Set<string> {
  // TODO: move this to claim or contents
  return new Set(Object.keys(credential.request.claim.contents))
}

/**
 * Creates a public presentation which can be sent to a verifier.
 * This presentation is signed.
 *
 * @param presentationOptions The additional options to use upon presentation generation.
 * @param presentationOptions.credential The credential to create the presentation for.
 * @param presentationOptions.signer Keystore signer to sign the presentation.
 * @param presentationOptions.claimerDid The DID details of the presenter.
 * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
 * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
 * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
 * @param presentationOptions.keySelection The logic to select the right key to sign for the delegee. It defaults to picking the first key from the set of valid keys.
 * @returns A deep copy of the Credential with all but `publicAttributes` removed.
 */
export async function createPresentation({
  credential,
  selectedAttributes,
  signer,
  challenge,
  claimerDid,
  keySelection = DidUtils.defaultKeySelectionCallback,
}: {
  credential: ICredential
  selectedAttributes?: string[]
  signer: KeystoreSigner
  challenge?: string
  claimerDid: DidDetails
  keySelection?: DidKeySelectionCallback<DidVerificationKey>
}): Promise<ICredential> {
  const presentation =
    // clone the attestation and request for attestation because properties will be deleted later.
    // TODO: find a nice way to clone stuff
    JSON.parse(JSON.stringify(credential))

  // filter attributes that are not in public attributes
  const excludedClaimProperties = selectedAttributes
    ? Array.from(getAttributes(credential)).filter(
        (property) => !selectedAttributes.includes(property)
      )
    : []

  // remove these attributes
  RequestForAttestation.removeClaimProperties(
    presentation.request,
    excludedClaimProperties
  )

  const keys = claimerDid.getVerificationKeys(KeyRelationship.authentication)
  const selectedKeyId = (await keySelection(keys))?.id

  if (!selectedKeyId) {
    throw new SDKErrors.ERROR_UNSUPPORTED_KEY(KeyRelationship.authentication)
  }

  await RequestForAttestation.signWithDidKey(
    presentation.request,
    signer,
    claimerDid,
    selectedKeyId,
    {
      challenge,
    }
  )

  return presentation
}

/**
 * Compresses a [[Credential]] object.
 *
 * @param credential - The credential to compress.
 * @returns An array that contains the same properties of a [[Credential]].
 */
export function compress(credential: ICredential): CompressedCredential {
  return CredentialUtils.compress(credential)
}

/**
 * [STATIC] Builds a [[Credential]] from the decompressed array.
 *
 * @param credential The [[CompressedCredential]] that should get decompressed.
 * @returns A new [[Credential]] object.
 */
export function decompress(credential: CompressedCredential): ICredential {
  const decompressedCredential = CredentialUtils.decompress(credential)
  CredentialUtils.errorCheck(decompressedCredential)
  return decompressedCredential
}

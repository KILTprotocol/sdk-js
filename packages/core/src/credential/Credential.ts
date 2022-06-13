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
  ICType,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as Attestation from '../attestation/index.js'
import { verifyClaimAgainstSchema } from '../ctype/index.js'
import * as RequestForAttestation from '../requestforattestation/index.js'

/**
 * Verifies whether the data of the given credential is valid. It is valid if:
 * * the [[RequestForAttestation]] object associated with this credential has valid data (see [[RequestForAttestation.verifyDataIntegrity]]);
 * and
 * * the hash of the [[RequestForAttestation]] object for the credential, and the hash of the [[Claim]] for the credential are the same.
 *
 * @param credential - The credential to verify.
 * @returns Whether the credential's data is valid.
 */
export function verifyDataIntegrity(credential: ICredential): boolean {
  if (credential.request.claim.cTypeHash !== credential.attestation.cTypeHash)
    return false
  return (
    credential.request.rootHash === credential.attestation.claimHash &&
    RequestForAttestation.verifyDataIntegrity(credential.request)
  )
}

/**
 * Checks whether the input meets all the required criteria of an ICredential object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial ICredential.
 * @throws [[ERROR_ATTESTATION_NOT_PROVIDED]] or [[ERROR_RFA_NOT_PROVIDED]] when input's attestation and request respectively do not exist.
 * @throws [[ERROR_CREDENTIAL_UNVERIFIABLE]] when input's data could not be verified.
 *
 */
export function verifyDataStructure(input: ICredential): void {
  if (input.attestation) {
    Attestation.verifyDataStructure(input.attestation)
  } else throw new SDKErrors.ERROR_ATTESTATION_NOT_PROVIDED()

  if (input.request) {
    RequestForAttestation.verifyDataStructure(input.request)
  } else throw new SDKErrors.ERROR_RFA_NOT_PROVIDED()

  if (!verifyDataIntegrity(input as ICredential)) {
    throw new SDKErrors.ERROR_CREDENTIAL_UNVERIFIABLE()
  }
}

/**
 * Checks the [[Credential]] with a given [[CType]] to check if the claim meets the [[schema]] structure.
 *
 * @param credential A [[Credential]] object of an attested claim used for verification.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[Credential]] is valid.
 */
export function verifyAgainstCType(
  credential: ICredential,
  ctype: ICType
): boolean {
  verifyDataStructure(credential)
  return verifyClaimAgainstSchema(
    credential.request.claim.contents,
    ctype.schema
  )
}

/**
 * Builds a new instance of [[Credential]], from all required properties.
 *
 * @param request - The request for attestation for the claim that was attested.
 * @param attestation - The attestation for the claim by the attester.
 * @returns A new [[Credential]] object.
 */
export function fromRequestAndAttestation(
  request: IRequestForAttestation,
  attestation: IAttestation
): ICredential {
  const credential = {
    request,
    attestation,
  }
  verifyDataStructure(credential)
  return credential
}

/**
 * Custom Type Guard to determine input being of type ICredential.
 *
 * @param input The potentially only partial ICredential.
 *
 * @returns Boolean whether input is of type ICredential.
 */
export function isICredential(input: unknown): input is ICredential {
  try {
    verifyDataStructure(input as ICredential)
  } catch (error) {
    return false
  }
  return true
}

/**
 * (ASYNC) Verifies whether the credential is valid. It is valid if:
 * * the data is valid (see [[verifyDataIntegrity]]);
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
 */
export async function verify(
  credential: ICredential,
  verificationOpts: {
    resolver?: IDidResolver
    challenge?: string
  } = {}
): Promise<boolean> {
  return (
    verifyDataIntegrity(credential) &&
    (await RequestForAttestation.verifySignature(
      credential.request,
      verificationOpts
    )) &&
    Attestation.checkValidity(credential.attestation)
  )
}

/**
 * Verifies the data of each element of the given Array of ICredentials.
 *
 * @param legitimations Array of ICredentials to validate.
 * @throws [[ERROR_LEGITIMATIONS_UNVERIFIABLE]] when one of the ICredentials data is unable to be verified.
 *
 * @returns Boolean whether each element of the given Array of ICredentials is verifiable.
 */
export function validateLegitimations(legitimations: ICredential[]): boolean {
  legitimations.forEach((legitimation: ICredential) => {
    if (!verifyDataIntegrity(legitimation)) {
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
 * Compresses a [[Credential]] object into an array for storage and/or messaging.
 *
 * @param credential - The credential to compress.
 * @returns An array that contains the same properties of a [[Credential]].
 */
export function compress(credential: ICredential): CompressedCredential {
  verifyDataStructure(credential)

  return [
    RequestForAttestation.compress(credential.request),
    Attestation.compress(credential.attestation),
  ]
}

/**
 * Decompresses a [[Credential]] array from storage and/or message into an object.
 *
 * @param credential The [[CompressedCredential]] that should get decompressed.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when credential is not an Array or it's length is unequal 2.
 * @returns A new [[Credential]] object.
 */
export function decompress(credential: CompressedCredential): ICredential {
  if (!Array.isArray(credential) || credential.length !== 2) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Credential')
  }
  const decompressedCredential = {
    request: RequestForAttestation.decompress(credential[0]),
    attestation: Attestation.decompress(credential[1]),
  }
  verifyDataStructure(decompressedCredential)
  return decompressedCredential
}

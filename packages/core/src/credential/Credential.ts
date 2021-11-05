/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * In KILT, an [[Credential]] is a **credential**, which a Claimer can store locally and share with Verifiers as they wish.
 *
 * Once a [[RequestForAttestation]] has been made, the [[Attestation]] can be built and the Attester submits it wrapped in an [[Credential]] object.
 * This [[Credential]] also contains the original request for attestation.
 * RequestForAttestation also exposes a [[createPresentation]] method, that can be used by the claimer to hide some specific information from the verifier for more privacy.
 *
 * @packageDocumentation
 * @module Credential
 */

import type {
  ICredential,
  CompressedCredential,
  IAttestation,
  IRequestForAttestation,
  IDidDetails,
  IDidResolver,
  KeystoreSigner,
  IDidKeyDetails,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import Attestation from '../attestation/Attestation'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import CredentialUtils from './Credential.utils'

export default class Credential implements ICredential {
  /**
   * [STATIC] Builds an instance of [[Credential]], from a simple object with the same properties.
   * Used for deserialization.
   *
   * @param credentialInput - The base object from which to create the credential.
   * @returns A new instantiated [[Credential]] object.
   * @example ```javascript
   * // create an Credential object, so we can call methods on it (`serialized` is a serialized Credential object)
   * Credential.fromCredential(JSON.parse(serialized));
   * ```
   */
  public static fromCredential(credentialInput: ICredential): Credential {
    return new Credential(credentialInput)
  }

  /**
   * [STATIC] Builds a new instance of [[Credential]], from all required properties.
   *
   * @param request - The request for attestation for the claim that was attested.
   * @param attestation - The attestation for the claim by the attester.
   * @returns A new [[Credential]] object.
   * @example ```javascript
   * // create an Credential object after receiving the attestation from the attester
   * Credential.fromRequestAndAttestation(request, attestation);
   * ```
   */
  public static fromRequestAndAttestation(
    request: IRequestForAttestation,
    attestation: IAttestation
  ): Credential {
    return new Credential({
      request,
      attestation,
    })
  }

  /**
   *  [STATIC] Custom Type Guard to determine input being of type ICredential using the CredentialUtils errorCheck.
   *
   * @param input The potentially only partial ICredential.
   *
   * @returns Boolean whether input is of type ICredential.
   */
  public static isICredential(input: unknown): input is ICredential {
    try {
      CredentialUtils.errorCheck(input as ICredential)
    } catch (error) {
      return false
    }
    return true
  }

  public request: RequestForAttestation
  public attestation: Attestation

  /**
   * Builds a new [[Credential]] instance.
   *
   * @param credentialInput - The base object with all required input, from which to create the credential.
   * @example ```javascript
   * // Create an `Credential` upon successful `Attestation` creation:
   * const credential = new Credential(credentialInput);
   * ```
   */
  public constructor(credentialInput: ICredential) {
    CredentialUtils.errorCheck(credentialInput)
    this.request = RequestForAttestation.fromRequest(credentialInput.request)
    this.attestation = Attestation.fromAttestation(credentialInput.attestation)
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
   * @param verificationOpts
   * @param verificationOpts.claimerDid - The claimer's DID.
   * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity if it is not passed in.
   * Defaults to the DefaultResolver.
   * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
   * @returns A promise containing whether this credential is valid.
   * @example ```javascript
   * credential.verify().then((isVerified) => {
   * // `isVerified` is true if the attestation is verified, false otherwise
   * });
   * ```
   */
  public static async verify(
    credential: ICredential,
    verificationOpts: {
      resolver?: IDidResolver
      challenge?: string
    } = {}
  ): Promise<boolean> {
    return (
      Credential.verifyData(credential) &&
      (await RequestForAttestation.verifySignature(
        credential.request,
        verificationOpts
      )) &&
      Attestation.checkValidity(credential.attestation)
    )
  }

  public async verify(
    verificationOpts: {
      resolver?: IDidResolver
      challenge?: string
    } = {}
  ): Promise<boolean> {
    return Credential.verify(this, verificationOpts)
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
   * const verificationResult = credential.verifyData();
   * ```
   */
  public static verifyData(credential: ICredential): boolean {
    if (credential.request.claim.cTypeHash !== credential.attestation.cTypeHash)
      return false
    return (
      credential.request.rootHash === credential.attestation.claimHash &&
      RequestForAttestation.verifyData(credential.request)
    )
  }

  public verifyData(): boolean {
    return Credential.verifyData(this)
  }

  /**
   *  [STATIC] Verifies the data of each element of the given Array of ICredentials.
   *
   * @param legitimations Array of ICredentials to validate.
   * @throws [[ERROR_LEGITIMATIONS_UNVERIFIABLE]] when one of the ICredentials data is unable to be verified.
   *
   * @returns Boolean whether each element of the given Array of ICredentials is verifiable.
   */
  public static validateLegitimations(legitimations: ICredential[]): boolean {
    legitimations.forEach((legitimation: ICredential) => {
      if (!Credential.verifyData(legitimation)) {
        throw SDKErrors.ERROR_LEGITIMATIONS_UNVERIFIABLE()
      }
    })
    return true
  }

  /**
   * Gets the hash of the claim that corresponds to this attestation.
   *
   * @returns The hash of the claim for this attestation (claimHash).
   * @example ```javascript
   * attestation.getHash();
   * ```
   */
  public getHash(): string {
    return this.attestation.claimHash
  }

  public getAttributes(): Set<string> {
    // TODO: move this to claim or contents
    return new Set(Object.keys(this.request.claim.contents))
  }

  /**
   * Creates a public presentation which can be sent to a verifier.
   * This presentation is signed.
   *
   * @param presentationOptions
   * @param presentationOptions.signer Keystore signer to sign the presentation.
   * @param presentationOptions.claimerSigningKey If passed, this key is used for signing.
   * @param presentationOptions.claimerDid If no signing key is passed, the authentication key is fetched from the claimerDid (mandatory in that case).
   * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
   * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
   * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
   * @returns A deep copy of the Credential with all but `publicAttributes` removed.
   */
  public async createPresentation({
    selectedAttributes,
    signer,
    challenge,
    claimerSigningKey,
    claimerDid,
  }: {
    signer: KeystoreSigner
    claimerSigningKey?: IDidKeyDetails
    claimerDid?: IDidDetails
    challenge?: string
    selectedAttributes?: string[]
  }): Promise<Credential> {
    const attClaim = new Credential(
      // clone the attestation and request for attestation because properties will be deleted later.
      // TODO: find a nice way to clone stuff
      JSON.parse(JSON.stringify(this))
    )

    // filter attributes that are not in public attributes
    const excludedClaimProperties = selectedAttributes
      ? Array.from(this.getAttributes()).filter(
          (property) => !selectedAttributes.includes(property)
        )
      : []

    // remove these attributes
    attClaim.request.removeClaimProperties(excludedClaimProperties)

    if (claimerDid) {
      await attClaim.request.signWithDid(signer, claimerDid, challenge)
    } else if (claimerSigningKey) {
      await attClaim.request.signWithKey(signer, claimerSigningKey, challenge)
    } else {
      throw new Error(
        'Either a key or claimer did details are required for signing'
      )
    }
    return attClaim
  }

  /**
   * Compresses an [[Credential]] object.
   *
   * @returns An array that contains the same properties of an [[Credential]].
   */
  public compress(): CompressedCredential {
    return CredentialUtils.compress(this)
  }

  /**
   * [STATIC] Builds an [[Credential]] from the decompressed array.
   *
   * @param credential The [[CompressedCredential]] that should get decompressed.
   * @returns A new [[Credential]] object.
   */
  public static decompress(credential: CompressedCredential): Credential {
    const decompressedCredential = CredentialUtils.decompress(credential)
    return Credential.fromCredential(decompressedCredential)
  }
}

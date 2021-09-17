/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * In KILT, an [[AttestedClaim]] is a **credential**, which a Claimer can store locally and share with Verifiers as they wish.
 *
 * Once a [[RequestForAttestation]] has been made, the [[Attestation]] can be built and the Attester submits it wrapped in an [[AttestedClaim]] object.
 * This [[AttestedClaim]] also contains the original request for attestation.
 * RequestForAttestation also exposes a [[createPresentation]] method, that can be used by the claimer to hide some specific information from the verifier for more privacy.
 *
 * @packageDocumentation
 * @module AttestedClaim
 */

import type {
  IAttestedClaim,
  CompressedAttestedClaim,
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
import AttestedClaimUtils from './AttestedClaim.utils'

export default class AttestedClaim implements IAttestedClaim {
  /**
   * [STATIC] Builds an instance of [[AttestedClaim]], from a simple object with the same properties.
   * Used for deserialization.
   *
   * @param attestedClaimInput - The base object from which to create the attested claim.
   * @returns A new instantiated [[AttestedClaim]] object.
   * @example ```javascript
   * // create an AttestedClaim object, so we can call methods on it (`serialized` is a serialized AttestedClaim object)
   * AttestedClaim.fromAttestedClaim(JSON.parse(serialized));
   * ```
   */
  public static fromAttestedClaim(
    attestedClaimInput: IAttestedClaim
  ): AttestedClaim {
    return new AttestedClaim(attestedClaimInput)
  }

  /**
   * [STATIC] Builds a new instance of [[AttestedClaim]], from all required properties.
   *
   * @param request - The request for attestation for the claim that was attested.
   * @param attestation - The attestation for the claim by the attester.
   * @returns A new [[AttestedClaim]] object.
   * @example ```javascript
   * // create an AttestedClaim object after receiving the attestation from the attester
   * AttestedClaim.fromRequestAndAttestation(request, attestation);
   * ```
   */
  public static fromRequestAndAttestation(
    request: IRequestForAttestation,
    attestation: IAttestation
  ): AttestedClaim {
    return new AttestedClaim({
      request,
      attestation,
    })
  }

  /**
   *  [STATIC] Custom Type Guard to determine input being of type IAttestedClaim using the AttestedClaimUtils errorCheck.
   *
   * @param input The potentially only partial IAttestedClaim.
   *
   * @returns Boolean whether input is of type IAttestedClaim.
   */
  public static isIAttestedClaim(input: unknown): input is IAttestedClaim {
    try {
      AttestedClaimUtils.errorCheck(input as IAttestedClaim)
    } catch (error) {
      return false
    }
    return true
  }

  public request: RequestForAttestation
  public attestation: Attestation

  /**
   * Builds a new [[AttestedClaim]] instance.
   *
   * @param attestedClaimInput - The base object with all required input, from which to create the attested claim.
   * @example ```javascript
   * // Create an `AttestedClaim` upon successful `Attestation` creation:
   * const credential = new AttestedClaim(attestedClaimInput);
   * ```
   */
  public constructor(attestedClaimInput: IAttestedClaim) {
    AttestedClaimUtils.errorCheck(attestedClaimInput)
    this.request = RequestForAttestation.fromRequest(attestedClaimInput.request)
    this.attestation = Attestation.fromAttestation(
      attestedClaimInput.attestation
    )
  }

  /**
   * (ASYNC) Verifies whether the attested claim is valid. It is valid if:
   * * the data is valid (see [[verifyData]]);
   * and
   * * the [[Attestation]] object for this attested claim is valid (see [[Attestation.checkValidity]], where the **chain** is queried).
   *
   * Upon presentation of an attested claim, a verifier would call this [[verify]] function.
   *
   * @param attestedClaim - The attested claim to check for validity.
   * @param verificationOpts
   * @param verificationOpts.claimerDid - The claimer's identity as an [[IDidDetails]] object.
   * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity if it is not passed in.
   * Defaults to the DefaultResolver.
   * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
   * @returns A promise containing whether this attested claim is valid.
   * @example ```javascript
   * attestedClaim.verify().then((isVerified) => {
   * // `isVerified` is true if the attestation is verified, false otherwise
   * });
   * ```
   */
  public static async verify(
    attestedClaim: IAttestedClaim,
    verificationOpts: {
      resolver?: IDidResolver
      challenge?: string
    } = {}
  ): Promise<boolean> {
    return (
      AttestedClaim.verifyData(attestedClaim) &&
      (await RequestForAttestation.verifySignature(
        attestedClaim.request,
        verificationOpts
      )) &&
      Attestation.checkValidity(attestedClaim.attestation)
    )
  }

  public async verify(
    verificationOpts: {
      resolver?: IDidResolver
      challenge?: string
    } = {}
  ): Promise<boolean> {
    return AttestedClaim.verify(this, verificationOpts)
  }

  /**
   * Verifies whether the data of the given attested claim is valid. It is valid if:
   * * the [[RequestForAttestation]] object associated with this attested claim has valid data (see [[RequestForAttestation.verifyData]]);
   * and
   * * the hash of the [[RequestForAttestation]] object for the attested claim, and the hash of the [[Claim]] for the attested claim are the same.
   *
   * @param attestedClaim - The attested claim to verify.
   * @returns Whether the attested claim's data is valid.
   * @example ```javascript
   * const verificationResult = attestedClaim.verifyData();
   * ```
   */
  public static verifyData(attestedClaim: IAttestedClaim): boolean {
    if (
      attestedClaim.request.claim.cTypeHash !==
      attestedClaim.attestation.cTypeHash
    )
      return false
    return (
      attestedClaim.request.rootHash === attestedClaim.attestation.claimHash &&
      RequestForAttestation.verifyData(attestedClaim.request)
    )
  }

  public verifyData(): boolean {
    return AttestedClaim.verifyData(this)
  }

  /**
   *  [STATIC] Verifies the data of each element of the given Array of IAttestedClaims.
   *
   * @param legitimations Array of IAttestedClaims to validate.
   * @throws [[ERROR_LEGITIMATIONS_UNVERIFIABLE]] when one of the IAttestedClaims data is unable to be verified.
   *
   * @returns Boolean whether each element of the given Array of IAttestedClaims is verifiable.
   */
  public static validateLegitimations(
    legitimations: IAttestedClaim[]
  ): boolean {
    legitimations.forEach((legitimation: IAttestedClaim) => {
      if (!AttestedClaim.verifyData(legitimation)) {
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
   * @param presentationOptions.claimerDid If no signing key is passed, the required key is fetched from the claimerDid (mandatory in that case).
   * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
   * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
   * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
   * @returns A deep copy of the AttestedClaim with all but `publicAttributes` removed.
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
  }): Promise<AttestedClaim> {
    const attClaim = new AttestedClaim(
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
   * Compresses an [[AttestedClaim]] object.
   *
   * @returns An array that contains the same properties of an [[AttestedClaim]].
   */
  public compress(): CompressedAttestedClaim {
    return AttestedClaimUtils.compress(this)
  }

  /**
   * [STATIC] Builds an [[AttestedClaim]] from the decompressed array.
   *
   * @param attestedClaim The [[CompressedAttestedClaim]] that should get decompressed.
   * @returns A new [[AttestedClaim]] object.
   */
  public static decompress(
    attestedClaim: CompressedAttestedClaim
  ): AttestedClaim {
    const decompressedAttestedClaim = AttestedClaimUtils.decompress(
      attestedClaim
    )
    return AttestedClaim.fromAttestedClaim(decompressedAttestedClaim)
  }
}

/**
 * In KILT, the [[AttestedClaim]] is a **credential**, which a Claimer can store locally and share with Verifiers as they wish.
 *
 * Once a [[RequestForAttestation]] has been made, the [[Attestation]] can be built and the Attester submits it wrapped in an [[AttestedClaim]] object.
 * This [[AttestedClaim]] also contains the original request for attestation.
 * RequestForAttestation also exposes a [[createPresentation]] method, that can be used by the claimer to hide some specific information from the verifier for more privacy.
 *
 * @packageDocumentation
 * @module AttestedClaim
 * @preferred
 */

import Attestation from '../attestation/Attestation'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IAttestedClaim, { CompressedAttestedClaim } from '../types/AttestedClaim'
import AttestedClaimUtils from './AttestedClaim.utils'
import IRequestForAttestation from '../types/RequestForAttestation'
import { IAttestation } from '..'

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

  public static isAttestedClaim(
    input: IAttestedClaim
  ): input is IAttestedClaim {
    Attestation.isAttestation(input.attestation)
    RequestForAttestation.isIRequestForAttestation(input.request)
    if (!AttestedClaim.verifyData(input)) {
      throw new Error('could not verify Data of attested claim')
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
   * // Create an [[AttestedClaim]] upon successful [[Attestation]] creation:
   * const credential = new AttestedClaim(attestedClaimInput);
   * ```
   */
  public constructor(attestedClaimInput: IAttestedClaim) {
    AttestedClaim.isAttestedClaim(attestedClaimInput)
    this.request = RequestForAttestation.fromRequest(attestedClaimInput.request)
    this.attestation = Attestation.fromAttestation(
      attestedClaimInput.attestation
    )
  }

  /**
   * (ASYNC) Verifies whether the attested claim is valid. It is valid if:
   * * the data is valid (see [[verifyData]]);
   * and
   * * the [[Attestation]] object for this attested claim is valid (see [[Attestation.verify]], where the **chain** is queried).
   *
   * Upon presentation of an attested claim, a verifier would call this [[verify]] function.
   *
   * @param attestedClaim - The attested claim to check for validity.
   * @returns A promise containing whether this attested claim is valid.
   * @example ```javascript
   * attestedClaim.verify().then(isVerified => {
   *   // `isVerified` is true if the attestation is verified, false otherwise
   * });
   * ```
   */
  public async verify(): Promise<boolean> {
    return this.verifyData() && this.attestation.verify()
  }

  /**
   * Verifies whether the data of the given attested claim is valid. It is valid if:
   * * the [[RequestForAttestation]] object associated with this attested claim has valid data (see [[RequestForAttestation.verifyData]]);
   * and
   * * the hash of the [[RequestForAttestation]] object for the attested claim, and the hash of the [[Claim]] for the attestated claim are the same.
   *
   * @param attestedClaim - The attested claim to verify.
   * @returns Whether the attested claim's data is valid.
   * @example ```javascript
   * attestedClaim.verifyData();
   * ```
   */
  public static verifyData(attestedClaim: IAttestedClaim): boolean {
    return (
      RequestForAttestation.verifyData(attestedClaim.request) &&
      attestedClaim.request.rootHash === attestedClaim.attestation.claimHash
    )
  }


  public getAttributes(): Set<string> {
    // TODO: move this to claim or contents
    return new Set(Object.keys(this.request.claim.contents))
  }

  /**
   * Builds a presentation. A presentation is a custom view of the [[AttestedClaim]], in which the claimer controls what information should be shown.
   *
   * @param excludedClaimProperties - An array of [[Claim]] properties to **exclude**.
   * @param excludeIdentity - Whether the claimer's identity should be **excluded** from the presentation. By default, the claimer's identity is included (`excludeIdentity` is `false`).
   * @returns The newly created presentation.
   * @example ```javascript
   * // create a presentation that keeps `birthYear` and `identity` private
   * createPresentation(['birthYear'], true);
   * ```
   */
  public createPresentation(
    excludedClaimProperties: string[],
    excludeIdentity = false
  ): AttestedClaim {
    const result: AttestedClaim = AttestedClaim.fromAttestedClaim(this)
    result.request.removeClaimProperties(excludedClaimProperties)
    if (excludeIdentity) {
      result.request.removeClaimOwner()
    }
    return result
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

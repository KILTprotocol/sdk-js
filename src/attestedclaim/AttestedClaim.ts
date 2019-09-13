/**
 * In KILT, the AttestedClaim is a **credential**, which a Claimer can store locally and share with Verifiers as they wish.
 *
 * Once a [[RequestForAttestation]] has been made, the [[Attestation]] can be built and the Attester submits it wrapped in an [[AttestedClaim]] object. This [[AttestedClaim]] also contains the original request for attestation. RequestForAttestation also exposes a [[createPresentation]] method, that can be used by the claimer to hide some specific information from the verifier for more privacy.
 *
 * @module AttestedClaim
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import cloneDeep from 'lodash/cloneDeep'
import Attestation from '../attestation/Attestation'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IAttestedClaim from '../types/AttestedClaim'
import IAttestation from '../types/Attestation'
import IRequestForAttestation from '../types/RequestForAttestation'

export default class AttestedClaim implements IAttestedClaim {
  /**
   * [STATIC] Creates a new [[AttestedClaim]] instance from the given interface.
   *
   * @param obj - The base object from which to create the attested claim.
   * @returns A new attested claim.
   * @example
   * ```javascript
   * // if cloneDeep is a utility function that deep clones objects
   * const attestedClaimCopy = AttestedClaim.fromObject(cloneDeep(attestedClaim));
   * ```
   */
  public static fromObject(obj: IAttestedClaim): AttestedClaim {
    const newAttestedClaim: AttestedClaim = Object.create(
      AttestedClaim.prototype
    )
    newAttestedClaim.request = RequestForAttestation.fromObject(obj.request)
    newAttestedClaim.attestation = Attestation.fromObject(obj.attestation)
    return newAttestedClaim
  }

  public request: RequestForAttestation
  public attestation: Attestation

  /**
   * Builds a new [[AttestedClaim]] instance.
   *
   * @param request - A request for attestation, usually sent by a claimer.
   * @param attestation - The attestation to base the [[AttestedClaim]] on.
   * @example Create an [[AttestedClaim]] upon successful [[Attestation]] creation:
   * ```javascript
   * // connect to the blockchain
   * Kilt.default.connect('wss://full-nodes.kilt.io:9944');
   *
   * // store an attestation on chain
   * attestation.store(attester).then(() => {
   *    // the attestation was successfully stored so we can create an AttestedClaim
   *    const attestedClaim = new Kilt.AttestedClaim(requestForAttestation, attestation);
   *    console.log(JSON.stringify(attestedClaim));
   * }).catch(e => {
   *    console.log(e);
   * }).finally(() => {
   *    // disconnect from the blockchain
   *    Kilt.BlockchainApiConnection.getCached().then(blockchain => {
   *      blockchain.api.disconnect();
   *    });
   * });
   * ```
   *
   * About this example:
   * * see [[Attestation.store]] for details on the `store` method
   */
  public constructor(
    request: IRequestForAttestation,
    attestation: IAttestation
  ) {
    // TODO: this should be instantiated w/o fromObject
    this.request = RequestForAttestation.fromObject(request)
    this.attestation = Attestation.fromObject(attestation)
  }

  /**
   * (ASYNC) Verifies whether this attested claim is valid. It is valid if:
   * * the data is valid (see [[verifyData]]);
   * and
   * * the [[Attestation]] object for this attestated claim is valid (see [[Attestation.verify]], where the **chain** is queried).
   *
   * Upon presentation of an attested claim, a verifier would call this [[verify]] function.
   *
   * @returns A promise containing whether this attested claim is valid.
   * @example
   * ```javascript
   * attestedClaim.verify().then(data => {
   *    console.log('isVerified', data);
   * });
   * ```
   */
  public async verify(): Promise<boolean> {
    if (!this.verifyData()) {
      Promise.resolve(false)
    }
    return this.attestation.verify()
  }

  /**
   * Verifies whether the data of this attested claim is valid. It is valid if:
   * * the [[RequestForAttestation]] object associated with this attested claim has valid data (see [[RequestForAttestation.verifyData]]);
   * and
   * * the hash of the [[RequestForAttestation]] object for this attested claim, and the hash of the [[Claim]] for this attestated claim are the same.
   *
   * @returns Whether the attestated claim's data is valid.
   * @example
   * ```javascript
   * const isDataValid = attestedClaim.verifyData();
   * ```
   */
  public verifyData(): boolean {
    return (
      this.request.verifyData() &&
      this.request.hash === this.attestation.claimHash
    )
  }

  /**
   * Gets the hash of the claim that corresponds to this attestation.
   *
   * @returns The hash of the claim for this attestation (claimHash).
   * @example
   * ```javascript
   * const claimHash = attestation.getHash();
   * ```
   */
  public getHash(): string {
    return this.attestation.claimHash
  }

  /**
   * Builds a presentation. A presentation is a custom view of the [[AttestedClaim]], in which the claimer controls what information should be shown.
   *
   * @param excludedClaimProperties - An array of [[Claim]] properties to **exclude**.
   * @param excludeIdentity - Whether the claimer's identity should be **excluded** from the presentation. By default, the claimer's identity is included (`excludeIdentity` is `false`).
   * @returns The newly created presentation.
   * @example
   * ```javascript
   * // if claim.contents are:
   * // {
   * //   isOver18: true,
   * //   birthYear: 1990
   * // }
   *
   * // create a presentation that only discloses `isOver18`, while `birthYear` and `identity` remain private
   * const presentation = createPresentation(['birthYear'], true);
   * ```
   */
  public createPresentation(
    excludedClaimProperties: string[],
    excludeIdentity: boolean = false
  ): AttestedClaim {
    const result: AttestedClaim = AttestedClaim.fromObject(cloneDeep(this))
    result.request.removeClaimProperties(excludedClaimProperties)
    if (excludeIdentity) {
      result.request.removeClaimOwner()
    }
    return result
  }
}

/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a [[RequestForAttestation]].
 *
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": yes`;
 * * a [[CType]] that represents its data structure.
 *
 * A claim object's owner is (should be) the same entity as the claimer.
 *
 * @packageDocumentation
 * @module Claim
 * @preferred
 */

import ICType from '../ctype/CType'
import CTypeUtils from '../ctype/CType.utils'
import IClaim, { CompressedClaim } from '../types/Claim'
import IPublicIdentity from '../types/PublicIdentity'
import ClaimUtils from './Claim.utils'
import * as SDKErrors from '../errorhandling/SDKErrors'

function verifyClaim(
  claimContents: IClaim['contents'],
  cTypeSchema: ICType['schema']
): boolean {
  return CTypeUtils.verifyClaimStructure(claimContents, cTypeSchema)
}

export default class Claim implements IClaim {
  /**
   * Instantiates a new Claim from the given [[IClaim]] and [[schema]].
   *
   * @param claimInput IClaim to instantiate the new claim from.
   * @param cTypeSchema ICType['schema'] to verify claimInput's contents.
   * @throws When claimInput's contents could not be verified with the provided cTypeSchema.
   * @throws [[ERROR_CLAIM_UNVERIFIABLE]].
   *
   * @returns An instantiated Claim.
   */
  public static fromClaim(
    claimInput: IClaim,
    cTypeSchema: ICType['schema']
  ): Claim {
    if (!verifyClaim(claimInput.contents, cTypeSchema)) {
      throw SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
    }

    return new Claim(claimInput)
  }

  /**
   * [STATIC] Builds a [[Claim]] from a [[CType]] which has nested [[CType]]s within the schema.
   *
   * @param cTypeInput A [[CType]] object that has nested [[CType]]s.
   * @param nestedCType The array of [[CType]]s, which are used inside the main [[CType]].
   * @param claimContents The data inside the [[Claim]].
   * @param claimOwner The [[PublicIdentity]] of the owner of the [[Claim]].
   *
   * @returns A [[Claim]] the owner can use.
   */

  public static fromNestedCTypeClaim(
    cTypeInput: ICType,
    nestedCType: Array<ICType['schema']>,
    claimContents: IClaim['contents'],
    claimOwner: IPublicIdentity['address']
  ): Claim {
    if (
      !CTypeUtils.validateNestedSchemas(
        cTypeInput.schema,
        nestedCType,
        claimContents
      )
    ) {
      throw SDKErrors.ERROR_NESTED_CLAIM_UNVERIFIABLE()
    }
    return new Claim({
      cTypeHash: cTypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  /**
   * Instantiates a new Claim from the given [[ICType]], IClaim['contents'] and IPublicIdentity['address'].
   *
   * @param ctypeInput [[ICType]] for which the Claim will be built.
   * @param claimContents IClaim['contents'] to be used as the pure contents of the instantiated Claim.
   * @param claimOwner IPublicIdentity['address'] to be used as the Claim owner.
   * @throws When claimInput's contents could not be verified with the schema of the provided ctypeInput.
   * @throws [[ERROR_CLAIM_UNVERIFIABLE]].
   *
   * @returns An instantiated Claim.
   */
  public static fromCTypeAndClaimContents(
    ctypeInput: ICType,
    claimContents: IClaim['contents'],
    claimOwner: IPublicIdentity['address']
  ): Claim {
    if (ctypeInput.schema) {
      if (!verifyClaim(claimContents, ctypeInput.schema)) {
        throw SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
      }
    }
    return new Claim({
      cTypeHash: ctypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  /**
   *  [STATIC] Custom Type Guard to determine input being of type IClaim using the ClaimUtils errorCheck.
   *
   * @param input The potentially only partial IClaim.
   *
   * @returns Boolean whether input is of type IClaim.
   */
  static isIClaim(input: object): input is IClaim {
    try {
      ClaimUtils.errorCheck(input as IClaim)
    } catch (error) {
      return false
    }
    return true
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(claimInput: IClaim) {
    ClaimUtils.errorCheck(claimInput)
    this.cTypeHash = claimInput.cTypeHash
    this.contents = claimInput.contents
    this.owner = claimInput.owner
  }

  /**
   * Compresses an [[Claim]] object from the [[CompressedClaim]].
   *
   * @returns An array that contains the same properties of an [[Claim]].
   */

  public compress(): CompressedClaim {
    return ClaimUtils.compress(this)
  }

  /**
   * [STATIC] Builds an [[Claim]] from the decompressed array.
   *
   * @returns A new [[Claim]] object.
   */

  public static decompress(compressedClaim: CompressedClaim): Claim {
    const decompressedClaim = ClaimUtils.decompress(compressedClaim)
    return new Claim(decompressedClaim)
  }
}

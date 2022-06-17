/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IClaim,
  CompressedClaim,
  CompressedPartialClaim,
  PartialClaim,
  IDidDetails,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { CType as ICType } from '../ctype/CType.js'
import * as CTypeUtils from '../ctype/CType.utils.js'
import * as ClaimUtils from './Claim.utils.js'

function verifyClaim(
  claimContents: IClaim['contents'],
  cTypeSchema: ICType['schema']
): boolean {
  return CTypeUtils.verifyClaimStructure(claimContents, cTypeSchema)
}

/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a [[RequestForAttestation]].
 *
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": yes`;
 * * a [[CType]] that represents its data structure.
 *
 * A claim object's owner is (should be) the same entity as the claimer.
 */
export class Claim implements IClaim {
  /**
   * Instantiates a new Claim from the given [[IClaim]] and [[schema]].
   *
   * @param claimInput IClaim to instantiate the new claim from.
   * @param cTypeSchema ICType['schema'] to verify claimInput's contents.
   * @throws [[ERROR_CLAIM_UNVERIFIABLE]] when claimInput's contents could not be verified with the provided cTypeSchema.
   *
   * @returns An instantiated Claim.
   */
  public static fromClaim(
    claimInput: IClaim,
    cTypeSchema: ICType['schema']
  ): Claim {
    if (!verifyClaim(claimInput.contents, cTypeSchema)) {
      throw new SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
    }

    return new Claim(claimInput)
  }

  /**
   * [STATIC] Builds a [[Claim]] from a [[CType]] which has nested [[CType]]s within the schema.
   *
   * @param cTypeInput A [[CType]] object that has nested [[CType]]s.
   * @param nestedCType The array of [[CType]]s, which are used inside the main [[CType]].
   * @param claimContents The data inside the [[Claim]].
   * @param claimOwner The DID of the owner of the [[Claim]].
   *
   * @returns A [[Claim]] the owner can use.
   */

  public static fromNestedCTypeClaim(
    cTypeInput: ICType,
    nestedCType: Array<ICType['schema']>,
    claimContents: IClaim['contents'],
    claimOwner: IDidDetails['uri']
  ): Claim {
    if (
      !CTypeUtils.validateNestedSchemas(
        cTypeInput.schema,
        nestedCType,
        claimContents
      )
    ) {
      throw new SDKErrors.ERROR_NESTED_CLAIM_UNVERIFIABLE()
    }
    return new Claim({
      cTypeHash: cTypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  /**
   * Instantiates a new Claim from the given [[ICType]], IClaim['contents'] and IDidDetails['did'].
   *
   * @param ctypeInput [[ICType]] for which the Claim will be built.
   * @param claimContents IClaim['contents'] to be used as the pure contents of the instantiated Claim.
   * @param claimOwner The DID to be used as the Claim owner.
   * @throws [[ERROR_CLAIM_UNVERIFIABLE]] when claimInput's contents could not be verified with the schema of the provided ctypeInput.
   *
   * @returns An instantiated Claim.
   */
  public static fromCTypeAndClaimContents(
    ctypeInput: ICType,
    claimContents: IClaim['contents'],
    claimOwner: IDidDetails['uri']
  ): Claim {
    if (ctypeInput.schema) {
      if (!verifyClaim(claimContents, ctypeInput.schema)) {
        throw new SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
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
  static isIClaim(input: unknown): input is IClaim {
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
   * Compresses the [[Claim]] object to a [[CompressedClaim]].
   *
   * @returns An array that contains the same properties of an [[Claim]].
   */

  public compress(): CompressedClaim {
    return ClaimUtils.compress(this)
  }

  /**
   *  Decompresses the [[IClaim]] from storage and/or message.
   *
   * @param claim A [[CompressedClaim]] array that is reverted back into an object.
   * @throws [[ERROR_DECOMPRESSION_ARRAY]] when an [[CompressedClaim]] is not an Array or it's length is unequal 3.
   * @returns An [[IClaim]] object that has the same properties as the [[CompressedClaim]].
   */
  public static decompress(claim: CompressedClaim): IClaim
  /**
   *  Decompresses the Partial [[IClaim]] from storage and/or message.
   *
   * @param claim An [[CompressedPartialClaim]] array that is reverted back into an object.
   * @throws [[ERROR_DECOMPRESSION_ARRAY]] when an [[CompressedPartialClaim]] is not an Array or it's length is unequal 3.
   * @returns An [[PartialClaim]] object that has the same properties as the [[CompressedPartialClaim]].
   */
  public static decompress(claim: CompressedPartialClaim): PartialClaim
  public static decompress(
    compressedClaim: CompressedClaim | CompressedPartialClaim
  ): IClaim | PartialClaim {
    return ClaimUtils.decompress(compressedClaim)
  }
}

/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a [[RequestForAttestation]].
 * ***
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": yes`;
 * * a [[CType]] that represents its data structure.
 * <br><br>
 * A claim object's owner is (should be) the same entity as the claimer.
 *
 * @module Claim
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import ICType from '../ctype/CType'
import CTypeUtils from '../ctype/CTypeUtils'
import IClaim from '../types/Claim'
import IPublicIdentity from '../types/PublicIdentity'

function verifyClaim(
  claimContents: object,
  cTypeSchema: ICType['schema']
): boolean {
  return CTypeUtils.verifyClaimStructure(claimContents, cTypeSchema)
}

export default class Claim implements IClaim {
  public static fromClaim(
    claimInput: IClaim,
    cTypeSchema: ICType['schema']
  ): Claim {
    if (cTypeSchema) {
      if (!verifyClaim(claimInput.contents, cTypeSchema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim(claimInput)
  }

  public static fromNestedCTypeClaim(
    cTypeInput: ICType,
    nestedCType: Array<ICType['schema']>,
    claimContents: object,
    claimOwner: IPublicIdentity['address']
  ): Claim {
    if (
      !CTypeUtils.validateNestedSchemas(
        cTypeInput.schema,
        nestedCType,
        claimContents
      )
    ) {
      throw Error('Nested claim data does not validate against CType')
    }
    return new Claim({
      cTypeHash: cTypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  public static fromCTypeAndClaimContents(
    ctypeInput: ICType,
    claimContents: object,
    claimOwner: IPublicIdentity['address']
  ): Claim {
    if (ctypeInput.schema) {
      if (!verifyClaim(claimContents, ctypeInput.schema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim({
      cTypeHash: ctypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(claimInput: IClaim) {
    if (!claimInput.cTypeHash || !claimInput.contents || !claimInput.owner) {
      throw new Error(
        `Property Not Provided while building Claim:\n
        claimInput.cTypeHash:\n
          ${claimInput.cTypeHash}\n
          claimInput.contents:\n
          ${claimInput.contents}\n
          claimInput.owner:\n'
          ${claimInput.owner}`
      )
    }
    this.cTypeHash = claimInput.cTypeHash
    this.contents = claimInput.contents
    this.owner = claimInput.owner
  }
}

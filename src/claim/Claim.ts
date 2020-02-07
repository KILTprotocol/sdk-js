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

import { validateAddress, validateHash } from '../util/DataUtils'
import ICType from '../ctype/CType'
import CTypeUtils from '../ctype/CType.utils'
import IClaim, { CompressedClaim } from '../types/Claim'
import IPublicIdentity from '../types/PublicIdentity'
import ClaimUtils from './Claim.utils'

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
   *
   * @returns An instantiated Claim.
   */
  public static fromClaim(
    claimInput: IClaim,
    cTypeSchema: ICType['schema']
  ): Claim {
    if (!verifyClaim(claimInput.contents, cTypeSchema)) {
      throw Error('Claim not valid')
    }

    return new Claim(claimInput)
  }

  /**
   * Instantiates a new Claim from the given [[ICType]], IClaim['contents'] and IPublicIdentity['address'].
   *
   * @param ctypeInput [[ICType]] for which the Claim will be built.
   * @param claimContents IClaim['contents'] to be used as the pure contents of the instantiated Claim.
   * @param claimOwner IPublicIdentity['address'] to be used as the Claim owner.
   * @throws When claimInput's contents could not be verified with the schema of the provided ctypeInput.
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
        throw Error('Claim not valid')
      }
    }
    return new Claim({
      cTypeHash: ctypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  static isIClaim(input: Partial<IClaim>): input is IClaim {
    // This accepts deleted owner property, until we remove removeClaimOwner
    if (!input.cTypeHash || !input.contents) {
      throw new Error('property of provided Claim not set')
    }
    if (input.owner) {
      validateAddress(input.owner, 'Claim Owner')
    }
    validateHash(input.cTypeHash, 'Claim CType')
    // TODO: check whether ctype hash is on chain, access schema and verify Claim Structure
    return true
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(claimInput: IClaim) {
    Claim.isIClaim(claimInput)
    this.cTypeHash = claimInput.cTypeHash
    this.contents = claimInput.contents
    this.owner = claimInput.owner
  }

  private static constructorInputCheck(claimInput: IClaim): void {
    const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
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
    if (!claimInput.cTypeHash.match(blake2bPattern)) {
      throw new Error(
        `Provided claimHash malformed:\n
        ${claimInput.cTypeHash}`
      )
    }
    if (!checkAddress(claimInput.owner, 42)[0]) {
      throw new Error(`Owner address provided invalid`)
    }
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

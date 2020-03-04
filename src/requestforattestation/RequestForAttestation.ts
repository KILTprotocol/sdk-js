/**
 * Requests for attestation are a core building block of the KILT SDK.
 * A RequestForAttestation represents a [[Claim]] which needs to be validated. In practice, the RequestForAttestation is sent from a claimer to an attester.
 *
 * A RequestForAttestation object contains the [[Claim]] and its hash, and legitimations/delegationId of the attester.
 * It's signed by the claimer, to make it tamperproof (`claimerSignature` is a property of [[Claim]]).
 * A RequestForAttestation also supports hiding of claim data during a credential presentation.
 *
 * @packageDocumentation
 * @module RequestForAttestation
 * @preferred
 */
import * as jsonabc from 'jsonabc'
import { v4 as uuid } from 'uuid'
import {
  verify,
  hash,
  coToUInt8,
  u8aToHex,
  u8aConcat,
  hashObjectAsStr,
} from '../crypto/Crypto'

import Identity from '../identity/Identity'
import AttestedClaim, {
  decompressAttestedClaim,
  compressAttestedClaim,
  CompressedAttestedClaim,
} from '../attestedclaim/AttestedClaim'
import { CompressedClaim, compressClaim, decompressClaim } from '../claim/Claim'
import IRequestForAttestation, {
  Hash,
  NonceHash,
  ClaimHashTree,
} from '../types/RequestForAttestation'
import { IDelegationBaseNode } from '../types/Delegation'
import IClaim from '../types/Claim'
import IAttestedClaim from '../types/AttestedClaim'

type CompressedNonceHash = [string, string?]

type CompressedClaimHashTree = object

type CompressedClaimOwner = CompressedNonceHash
type CompressedCTypeHash = CompressedNonceHash

export type CompressedRequestForAttestation = [
  CompressedClaim,
  CompressedClaimHashTree,
  CompressedClaimOwner,
  RequestForAttestation['claimerSignature'],
  CompressedCTypeHash,
  RequestForAttestation['rootHash'],
  CompressedAttestedClaim[],
  RequestForAttestation['delegationId']
]

function hashNonceValue(nonce: string, value: any): string {
  return hashObjectAsStr(value, nonce)
}

function generateHash(value: any): NonceHash {
  const nonce: string = uuid()
  return {
    nonce,
    hash: hashNonceValue(nonce, value),
  }
}

function generateHashTree(contents: object): ClaimHashTree {
  const result: ClaimHashTree = {}

  Object.keys(contents).forEach(key => {
    result[key] = generateHash(contents[key])
  })

  return result
}

function verifyClaimerSignature(reqForAtt: RequestForAttestation): boolean {
  return verify(
    reqForAtt.rootHash,
    reqForAtt.claimerSignature,
    reqForAtt.claim.owner
  )
}

function getHashRoot(leaves: Uint8Array[]): Uint8Array {
  const result = u8aConcat(...leaves)
  return hash(result)
}

/**
 *  Compresses an nonce and hash from a [[ClaimHashTree]] or [[RequestForAttestation]] properties.
 *
 * @param nonceHash A hash or a hash and nonce object that will be sorted and stripped for messaging or storage.
 *
 * @returns An object compressing of a hash or a hash and nonce.
 */

export function compressNonceAndHash(
  nonceHash: NonceHash
): CompressedNonceHash {
  return [nonceHash.hash, nonceHash.nonce]
}

/**
 *  Decompresses an nonce and hash from a [[ClaimHashTree]] or [[RequestForAttestation]] properties.
 *
 * @param nonceHash A compressesd a hash or a hash and nonce array that is reverted back into an object.
 *
 * @returns An object compressing of a hash or a hash and nonce.
 */

function decompressNonceAndHash(nonceHash: CompressedNonceHash): NonceHash {
  // Need to fix
  if (nonceHash.length === 1) {
    return {
      hash: nonceHash[0],
    }
  }
  return {
    hash: nonceHash[0],
    nonce: nonceHash[1],
  }
}

/**
 *  Compresses a [[claimHashTree]] within a [[RequestForAttestation]] object.
 *
 * @param reqForAtt A [[claimHashTree]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[claimHashTree]].
 */

export function compressClaimHashTree(
  claimHashTree: ClaimHashTree
): CompressedClaimHashTree {
  const sortedClaimHashTree = jsonabc.sortObj(claimHashTree)
  const result = {}

  Object.keys(sortedClaimHashTree).forEach(entryKey => {
    result[entryKey] = compressNonceAndHash(sortedClaimHashTree[entryKey])
  })
  return result
}

/**
 *  Decompresses a claim hash tree from storage and/or message.
 *
 * @param reqForAtt A compressesd claim hash tree array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an claim hash tree.
 */

export function decompressClaimHashTree(
  compressedClaimHashTree: CompressedClaimHashTree
): ClaimHashTree {
  const result = {}

  Object.keys(compressedClaimHashTree).forEach(entryKey => {
    result[entryKey] = decompressNonceAndHash(compressedClaimHashTree[entryKey])
  })
  return result
}

/**
 *  Compresses [[AttestedClaim]]s which are made up from an [[Attestation]] and [[RequestForAttestation]] for storage and/or message.
 *
 * @param leg An array of [[Attestation]] and [[RequestForAttestation]] objects.
 *
 * @returns An ordered array of [[AttestedClaim]]s.
 */

export function compressLegitimation(
  leg: IAttestedClaim[]
): CompressedAttestedClaim[] {
  return leg.map(compressAttestedClaim)
}

/**
 *  Decompresses [[AttestedClaim]]s which are an [[Attestation]] and [[RequestForAttestation]] from storage and/or message.
 *
 * @param leg A compressesd [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[AttestedClaim]].
 */

function decompressLegitimation(
  leg: CompressedAttestedClaim[]
): IAttestedClaim[] {
  return leg.map(decompressAttestedClaim)
}

/**
 *  Compresses a [[RequestForAttestation]] for storage and/or messaging.
 *
 * @param reqForAtt A [[RequestForAttestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[RequestForAttestation]].
 */

export function compressRequestForAttestation(
  reqForAtt: IRequestForAttestation
): CompressedRequestForAttestation {
  return [
    compressClaim(reqForAtt.claim),
    compressClaimHashTree(reqForAtt.claimHashTree),
    compressNonceAndHash(reqForAtt.claimOwner),
    reqForAtt.claimerSignature,
    compressNonceAndHash(reqForAtt.cTypeHash),
    reqForAtt.rootHash,
    compressLegitimation(reqForAtt.legitimations),
    reqForAtt.delegationId,
  ]
}

/**
 *  Decompresses a [[RequestForAttestation]] from storage and/or message.
 *
 * @param reqForAtt A compressesd [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[RequestForAttestation]].
 */

export function decompressRequestForAttestation(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  return {
    claim: decompressClaim(reqForAtt[0]),
    claimHashTree: decompressClaimHashTree(reqForAtt[1]),
    claimOwner: decompressNonceAndHash(reqForAtt[2]),
    claimerSignature: reqForAtt[3],
    cTypeHash: decompressNonceAndHash(reqForAtt[4]),
    rootHash: reqForAtt[5],
    legitimations: decompressLegitimation(reqForAtt[6]),
    delegationId: reqForAtt[7],
  }
}

export default class RequestForAttestation implements IRequestForAttestation {
  /**
   * [STATIC] Builds an instance of [[RequestForAttestation]], from a simple object with the same properties.
   * Used for deserialization.
   *
   * @param requestForAttestationInput - An object built from simple [[Claim]], [[Identity]] and legitimation objects.
   * @returns  A new [[RequestForAttestation]] `object`.
   * @example ```javascript
   * const serializedRequest =
   *   '{ "claim": { "cType": "0x981...", "contents": { "name": "Alice", "age": 29 }, owner: "5Gf..." }, ... }, ... }';
   * const parsedRequest = JSON.parse(serializedRequest);
   * RequestForAttestation.fromRequest(parsedRequest);
   * ```
   */
  public static fromRequest(
    requestForAttestationInput: IRequestForAttestation
  ): RequestForAttestation {
    return new RequestForAttestation(requestForAttestationInput)
  }

  /**
   * [STATIC] Builds a new instance of [[RequestForAttestation]], from a complete set of requiered parameters.
   *
   * @param claimInput - An `IClaim` object the request for attestation is built for.
   * @param identity - The Claimer's [Identity].
   * @param legitimationsInput - Array of [AttestedClaim] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
   * @param delegationIdInput - The id of the DelegationNode of the Attester, which should be used in the attestation.
   * @returns  A new [[RequestForAttestation]] object.
   * @example ```javascript
   * const requestForAttestation = RequestForAttestation.fromClaimAndIdentity(
   *   claim,
   *   alice
   * );
   * ```
   */
  public static fromClaimAndIdentity(
    claimInput: IClaim,
    identity: Identity,
    legitimationsInput: AttestedClaim[] = [],
    delegationIdInput: IDelegationBaseNode['id'] | null = null
  ): RequestForAttestation {
    if (claimInput.owner !== identity.address) {
      throw Error('Claim owner is not Identity')
    }
    const claimOwnerGenerated = generateHash(claimInput.owner)
    const cTypeHashGenerated = generateHash(claimInput.cTypeHash)
    const claimHashTreeGenerated = generateHashTree(claimInput.contents)
    const calculatedRootHash = RequestForAttestation.calculateRootHash(
      claimOwnerGenerated,
      cTypeHashGenerated,
      claimHashTreeGenerated,
      legitimationsInput,
      delegationIdInput
    )
    let legitimations: AttestedClaim[] = []
    if (Array.isArray(legitimationsInput)) {
      legitimations = legitimationsInput
    }
    return new RequestForAttestation({
      claim: claimInput,
      legitimations,
      claimOwner: claimOwnerGenerated,
      claimHashTree: claimHashTreeGenerated,
      cTypeHash: cTypeHashGenerated,
      rootHash: calculatedRootHash,
      claimerSignature: RequestForAttestation.sign(
        identity,
        calculatedRootHash
      ),
      delegationId: delegationIdInput,
    })
  }

  public claim: IClaim
  public legitimations: AttestedClaim[]
  public claimOwner: NonceHash
  public claimerSignature: string
  public claimHashTree: ClaimHashTree
  public cTypeHash: NonceHash
  public rootHash: Hash

  public delegationId: IDelegationBaseNode['id'] | null

  /**
   * Builds a new [[RequestForAttestation]] instance.
   *
   * @param requestForAttestationInput - The base object from which to create the requestForAttestation.
   * @example ```javascript
   * // create a new request for attestation
   * const reqForAtt = new RequestForAttestation(requestForAttestationInput);
   * ```
   */
  public constructor(requestForAttestationInput: IRequestForAttestation) {
    if (
      !requestForAttestationInput.claim ||
      !requestForAttestationInput.legitimations ||
      !requestForAttestationInput.claimOwner ||
      !requestForAttestationInput.claimerSignature ||
      !requestForAttestationInput.claimHashTree ||
      !requestForAttestationInput.cTypeHash ||
      !requestForAttestationInput.rootHash
    ) {
      throw new Error(
        `Property Not Provided while building RequestForAttestation:\n
          requestInput.claim:\n
          ${requestForAttestationInput.claim}\n
          requestInput.legitimations:\n
          ${requestForAttestationInput.legitimations}\n
          requestInput.claimOwner:\n
          ${requestForAttestationInput.claimOwner}\n
          requestInput.claimerSignature:\n
          ${requestForAttestationInput.claimerSignature}
          requestInput.claimHashTree:\n
          ${requestForAttestationInput.claimHashTree}\n
          requestInput.rootHash:\n
          ${requestForAttestationInput.rootHash}\n
          requestInput.cTypeHash:\n
          ${requestForAttestationInput.cTypeHash}\n`
      )
    }
    this.claim = requestForAttestationInput.claim
    this.claimOwner = requestForAttestationInput.claimOwner
    this.cTypeHash = requestForAttestationInput.cTypeHash
    if (
      typeof requestForAttestationInput.legitimations !== 'undefined' &&
      Array.isArray(requestForAttestationInput.legitimations) &&
      requestForAttestationInput.legitimations.length
    ) {
      this.legitimations = requestForAttestationInput.legitimations.map(
        legitimation => AttestedClaim.fromAttestedClaim(legitimation)
      )
    } else {
      this.legitimations = []
    }
    this.delegationId = requestForAttestationInput.delegationId
    this.claimHashTree = requestForAttestationInput.claimHashTree
    this.rootHash = requestForAttestationInput.rootHash
    this.claimerSignature = requestForAttestationInput.claimerSignature
    this.verifySignature()
    this.verifyData()
  }

  /**
   * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
   *
   * @param properties - Properties to remove from the [[Claim]] object.
   * @throws An error when a property which should be deleted wasn't found.
   * @example ```javascript
   * const rawClaim = {
   *   name: 'Alice',
   *   age: 29,
   * };
   * const claim = Claim.fromCTypeAndClaimContents(ctype, rawClaim, alice);
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity(
   *   claim,
   *   alice,
   *   [],
   *   null
   * );
   * reqForAtt.removeClaimProperties(['name']);
   * // reqForAtt does not contain `name` in its claimHashTree and its claim contents anymore.
   * ```
   */
  public removeClaimProperties(properties: string[]): void {
    properties.forEach(key => {
      if (!this.claimHashTree[key]) {
        throw Error(`Property '${key}' not found in claim`)
      }
      delete this.claim.contents[key]
      delete this.claimHashTree[key].nonce
    })
  }

  /**
   * Removes the [[Claim]] owner from the [[RequestForAttestation]] object.
   *
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity(
   *   claim,
   *   alice,
   *   [],
   *   null
   * );
   * reqForAtt.removeClaimOwner();
   * // `requestForAttestation` does not contain the claim `owner` or the `claimOwner`'s nonce anymore.
   * ```
   */
  public removeClaimOwner(): void {
    delete this.claim.owner
    delete this.claimOwner.nonce
  }

  /**
   * Verifies the data of the [[RequestForAttestation]] object; used to check that the data was not tampered with, by checking the data against hashes.
   *
   * @returns Whether the data is valid.
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity(
   *   claim,
   *   alice,
   *   [],
   *   null
   * );
   * reqForAtt.verifyData(); // returns true if the data is correct
   * ```
   */
  public verifyData(): boolean {
    // check claim hash
    if (
      this.rootHash !==
      RequestForAttestation.calculateRootHash(
        this.claimOwner,
        this.cTypeHash,
        this.claimHashTree,
        this.legitimations,
        this.delegationId
      )
    ) {
      return false
    }
    // check claim owner hash
    if (this.claim.owner) {
      if (
        !this.claimOwner.nonce ||
        this.claimOwner.hash !==
          hashNonceValue(this.claimOwner.nonce, this.claim.owner)
      ) {
        throw Error('Invalid hash for claim owner')
      }
    }

    // check cType hash
    if (this.claim.cTypeHash) {
      if (
        !this.cTypeHash.nonce ||
        this.cTypeHash.hash !==
          hashNonceValue(this.cTypeHash.nonce, this.claim.cTypeHash)
      ) {
        throw Error('Invalid hash for CTYPE')
      }
    }

    // check all hashes for provided claim properties
    Object.keys(this.claim.contents).forEach(key => {
      const value = this.claim.contents[key]
      if (!this.claimHashTree[key]) {
        throw Error(`Property '${key}' not in claim hash tree`)
      }
      const hashed: NonceHash = this.claimHashTree[key]
      if (
        !hashed.nonce ||
        hashed.hash !== hashNonceValue(hashed.nonce, value)
      ) {
        throw Error(`Invalid hash for property '${key}' in claim hash tree`)
      }
    })

    // check legitimations
    let valid = true
    if (this.legitimations) {
      this.legitimations.forEach(legitimation => {
        valid = valid && legitimation.verifyData()
      })
    }
    if (!valid) {
      return false
    }

    // check signature
    return this.verifySignature()
  }

  /**
   * Verifies the signature of the [[RequestForAttestation]] object.
   *
   * @returns Whether the signature is correct.
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity(
   *   claim,
   *   alice,
   *   [],
   *   null
   * );
   * reqForAtt.verifySignature(); // returns `true` if the signature is correct
   * ```
   */
  public verifySignature(): boolean {
    return verifyClaimerSignature(this)
  }

  private static sign(identity: Identity, rootHash: Hash): string {
    return identity.signStr(rootHash)
  }

  private static getHashLeaves(
    claimOwner: NonceHash,
    cTypeHash: NonceHash,
    claimHashTree: object,
    legitimations: AttestedClaim[],
    delegationId: IDelegationBaseNode['id'] | null
  ): Uint8Array[] {
    const result: Uint8Array[] = []
    result.push(coToUInt8(claimOwner.hash))
    result.push(coToUInt8(cTypeHash.hash))
    Object.keys(claimHashTree).forEach(key => {
      result.push(coToUInt8(claimHashTree[key].hash))
    })
    if (legitimations) {
      legitimations.forEach(legitimation => {
        result.push(coToUInt8(legitimation.getHash()))
      })
    }
    if (delegationId) {
      result.push(coToUInt8(delegationId))
    }

    return result
  }

  /**
   * Compresses an [[RequestForAttestation]] object from the [[compressRequestForAttestation]].
   *
   * @returns An array that contains the same properties of an [[RequestForAttestation]].
   */

  public compress(): CompressedRequestForAttestation {
    return compressRequestForAttestation(this)
  }

  /**
   * [STATIC] Builds an [[RequestForAttestation]] from the decompressed array.
   *
   * @returns A new [[RequestForAttestation]] object.
   */

  public static decompress(
    reqForAtt: IRequestForAttestation
  ): RequestForAttestation {
    return RequestForAttestation.fromRequest(reqForAtt)
  }

  private static calculateRootHash(
    claimOwner: NonceHash,
    cTypeHash: NonceHash,
    claimHashTree: object,
    legitimations: AttestedClaim[],
    delegationId: IDelegationBaseNode['id'] | null
  ): Hash {
    const hashes: Uint8Array[] = RequestForAttestation.getHashLeaves(
      claimOwner,
      cTypeHash,
      claimHashTree,
      legitimations,
      delegationId
    )
    const root: Uint8Array =
      hashes.length === 1 ? hashes[0] : getHashRoot(hashes)
    return u8aToHex(root)
  }
}

/**
 * @module RequestForAttestation
 */
import { v4 as uuid } from 'uuid'
import { IDelegationBaseNode } from '..'
import {
  verify,
  hash,
  coToUInt8,
  u8aToHex,
  u8aConcat,
  hashObjectAsStr,
} from '../crypto/Crypto'

import Identity from '../identity/Identity'
import IClaim from '../claim/Claim'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import IRequestForAttestation, {
  Hash,
  NonceHash,
} from '../types/RequestForAttestation'

function hashNonceValue(nonce: string, value: any) {
  return hashObjectAsStr(value, nonce)
}

function generateHash(value: any): NonceHash {
  const nonce: string = uuid()
  return {
    nonce,
    hash: hashNonceValue(nonce, value),
  }
}

function generateHashTree(contents: object): object {
  const result = {}
  for (const key of Object.keys(contents)) {
    result[key] = generateHash(contents[key])
  }

  return result
}

function verifyClaimerSignature(rfa: RequestForAttestation): boolean {
  return verify(rfa.hash, rfa.claimerSignature, rfa.claim.owner)
}

function getHashRoot(leaves: Uint8Array[]): Uint8Array {
  const result = u8aConcat(...leaves)
  return hash(result)
}

export default class RequestForAttestation implements IRequestForAttestation {
  /**
   * @description Builds a new [[Claim]] as an object
   * @param obj - An object built from the [[Claim]], [[Identity]] and legitimation objects
   * @returns Creates an [[RequestForAttestation]] `object`
   * @example
   * ```javascript
   *
   * // Using a CType schema
   *
   * const ctype = require("./ctype.json");
   *
   * const alice = Kilt.Identity.buildFromMnemonic();
   *  const rawClaim = {
   *  	name: "Alice",
   *  	age: 29
   *  };
   *
   * const claim = new Kilt.Claim(ctype, rawClaim, alice);
   *
   * const test = new Kilt.RequestForAttestation(claim, [], alice);
   *
   * Kilt.RequestForAttestation.fromObject(test)
   *
   * // (output) RequestForAttestation {
   * //           claim: Claim {
   * //           cType: '0x981955a2b7990554f6193a9e770ea625c68d2bfc5a1ff996e6e28d2a620fae16',
   * //           contents: { name: 'Alice', age: 29 },
   * //           owner: '5GfsMWtwtfLDP74V3vsJKkhJWuCh6GL8KFFuiHZZwkBL7xRT'
   * //           },
   * //          ...
   * //        },
   * //      ...
   * //     }
   *
   * ```
   */
  public static fromObject(obj: IRequestForAttestation): RequestForAttestation {
    const newClaim = Object.create(RequestForAttestation.prototype)
    const object = Object.assign(newClaim, obj)
    object.legitimations = object.legitimations.map(
      (legitimation: AttestedClaim) => AttestedClaim.fromObject(legitimation)
    )
    return object
  }

  public claim: IClaim
  public claimOwner: NonceHash
  public claimerSignature: string
  public claimHashTree: object
  public ctypeHash: NonceHash
  public hash: Hash
  public legitimations: AttestedClaim[]

  public delegationId?: IDelegationBaseNode['id']

  constructor(
    claim: IClaim,
    legitimations: AttestedClaim[],
    identity: Identity,
    delegationId?: IDelegationBaseNode['id']
  ) {
    if (claim.owner !== identity.address) {
      throw Error('Claim owner is not identity')
    }
    this.claim = claim
    this.claimOwner = generateHash(this.claim.owner)
    this.ctypeHash = generateHash(this.claim.cType)
    this.legitimations = legitimations
    this.delegationId = delegationId

    this.claimHashTree = generateHashTree(claim.contents)
    this.hash = this.calculateRootHash()
    this.claimerSignature = this.sign(identity)
  }
  /**
   * @description Removes a [[Claim]] Property from a [[Attestation]] object.
   * @param properties - A property within the [[Claim]] object
   * @returns  On a successful deletation of `this.claim.contents[key]` it returns true, else false will be returned
   * @returns On a successful deletation of `this.claimHashTree[key].nonce` it returns true, else false will be returned
   * @example
   * ```javascript
   *
   *  const alice = Kilt.Identity.buildFromMnemonic();
   *
   *  const rawClaim = {
   *  	name: "Alice",
   *  	age: 29
   *  };
   *
   *  const claim = new Kilt.Claim(ctype, rawClaim, alice);
   *
   *  const test = new Kilt.RequestForAttestation(claim, [], alice);
   *  // Removing the name field of the raw claim
   *  test.removeClaimProperties(["name"]);
   *
   *  Kilt.RequestForAttestation.fromObject(test);
   *
   *  // (output) RequestForAttestation {
   *  //           claim: Claim {
   *  //           cType: '0x981955a2b7990554f6193a9e770ea625c68d2bfc5a1ff996e6e28d2a620fae16',
   *  //           contents: { age: 29 },
   *  //           owner: '5Gf3Y1CC9UmXYQbSzbA3JE71nCWPjr8LVngzpjqC3YiAwuSp'
   *  //           },
   *
   *
   * ```
   */
  public removeClaimProperties(properties: string[]) {
    properties.forEach(key => {
      if (!this.claimHashTree.hasOwnProperty(key)) {
        throw Error(`Property '${key}' not found in claim`)
      }
      delete this.claim.contents[key]
      delete this.claimHashTree[key].nonce
    })
  }
  /**
   * @description Removes a [[Claim]] Owner from a [[Attestation]] object.
   * @returns  On a successful deletation of `this.claim.owner` it returns true, else false will be returned
   * @returns  On a successful deletation of `this.claimOwner.nonce` it returns true, else false will be returned
   * @example
   * ```javascript
   *
   *  const alice = Kilt.Identity.buildFromMnemonic();
   *
   *  const rawClaim = {
   *  	name: "Alice",
   *  	age: 29
   *    };
   *
   *  const claim = new Kilt.Claim(ctype, rawClaim, alice);
   *
   *  const test = new Kilt.RequestForAttestation(claim, [], alice);
   * // Removing the owner from the claim object
   *  test.removeClaimOwner();
   *
   *  Kilt.RequestForAttestation.fromObject(test);
   *
   * //(output) RequestForAttestation {
   * //          claim: Claim {
   * //          cType: '0x981955a2b7990554f6193a9e770ea625c68d2bfc5a1ff996e6e28d2a620fae16',
   * //          contents: { name: 'Alice', age: 29 }
   * //          },
   *
   * ```
   */
  public removeClaimOwner() {
    delete this.claim.owner
    delete this.claimOwner.nonce
  }

  /**
   * @description Verifies the data of the [[Attestation]] [[Claim]].
   * @returns On successful verification of data `this.verifySignature()` it returns true, else false will be returned.
   * @example
   * ```javascript
   *
   * const alice = Kilt.Identity.buildFromMnemonic();
   *
   *  const rawClaim = {
   * name: "Alice",
   * age: 29
   * };
   *
   * const claim = new Kilt.Claim(ctype, rawClaim, alice);
   *
   * const test = new Kilt.RequestForAttestation(claim, [], alice);
   * // Checks the data and returns a
   * const data = test.verifyData();
   *
   * (Output) true
   *
   * ```
   */
  public verifyData(): boolean {
    // check claim hash
    if (this.hash !== this.calculateRootHash()) {
      return false
    }
    // check claim owner hash
    if (this.claim.owner) {
      if (
        this.claimOwner.hash !==
        hashNonceValue(this.claimOwner.nonce, this.claim.owner)
      ) {
        throw Error('Invalid hash for claim owner')
      }
    }

    // check cType hash
    if (
      this.ctypeHash.hash !==
      hashNonceValue(this.ctypeHash.nonce, this.claim.cType)
    ) {
      throw Error('Invalid hash for CTYPE')
    }

    // check all hashes for provided claim properties
    for (const key of Object.keys(this.claim.contents)) {
      const value: any = this.claim.contents[key]
      if (!this.claimHashTree.hasOwnProperty(key)) {
        throw Error(`Property '${key}' not in claim hash tree`)
      }
      const hashed: NonceHash = this.claimHashTree[key]
      if (hashed.hash !== hashNonceValue(hashed.nonce, value)) {
        throw Error(`Invalid hash for property '${key}' in claim hash tree`)
      }
    }

    // check legitimations
    let valid: boolean = true
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
   * @description Verifies the signature of the claimer with the [[Attestation]] [[Claim]].
   * @returns On successful verification of the claimers signature `verifyClaimerSignature(this)` it returns true, else false will be returned.
   * @example
   * ```javascript
   *
   * const alice = Kilt.Identity.buildFromMnemonic();
   *
   *  const rawClaim = {
   * name: 'Alice',
   * age: 29
   * };
   *
   * const claim = new Kilt.Claim(ctype, rawClaim, alice);
   *
   * const test = new Kilt.RequestForAttestation(claim, [], alice);
   * // Checks the signature
   *  const signed = test.verifySignature()
   *
   *  (Output) true
   * ```
   */
  public verifySignature(): boolean {
    return verifyClaimerSignature(this)
  }

  private getHashLeaves(): Uint8Array[] {
    const result: Uint8Array[] = []
    result.push(coToUInt8(this.claimOwner.hash))
    result.push(coToUInt8(this.ctypeHash.hash))
    for (const key of Object.keys(this.claimHashTree)) {
      result.push(coToUInt8(this.claimHashTree[key].hash))
    }
    if (this.legitimations) {
      this.legitimations.forEach(legitimation => {
        result.push(coToUInt8(legitimation.getHash()))
      })
    }
    if (this.delegationId) {
      result.push(coToUInt8(this.delegationId))
    }

    return result
  }

  private calculateRootHash(): Hash {
    const hashes: Uint8Array[] = this.getHashLeaves()
    const root: Uint8Array =
      hashes.length === 1 ? hashes[0] : getHashRoot(hashes)
    return u8aToHex(root)
  }

  private sign(identity: Identity) {
    return identity.signStr(this.hash)
  }
}

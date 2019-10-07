/**
 * Requests for attestation are a core building block of the KILT SDK.
 * A RequestForAttestation represents a [[Claim]] which needs to be validated. In practice, the RequestForAttestation is sent from a claimer to an attester.
 *
 * A RequestForAttestation object contains the [[Claim]] and its hash, and legitimations/delegationId of the attester. It's signed by the claimer, to make it tamper proof (`claimerSignature` is a property of [[Claim]]). A RequestForAttestation also supports hiding of claim data during a credential presentation.
 *
 * @module RequestForAttestation
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
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

function generateHashTree(contents: object): object {
  const result = {}

  Object.keys(contents).forEach(key => {
    result[key] = generateHash(contents[key])
  })

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
   * [STATIC] Builds an instance of [[RequestForAttestation]], from a simple object with the same properties.
   * Used for deserialization.
   *
   * @param obj - An object built from simple [[Claim]], [[Identity]] and legitimation objects.
   * @returns  A new [[RequestForAttestation]] `object`.
   * @example ```javascript
   *  const serialized = '{ "claim": { "cType": "0x981...", "contents": { "name": "Alice", "age": 29 }, owner: "5Gf..." }, ... }, ... }';
   * const parsed = JSON.parse(serialized);
   * RequestForAttestation.fromObject(parsed);
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

  public constructor(
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
   * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
   *
   * @param properties - A property within the underlying [[Claim]] object.
   * @throws An error, when a property, which should be deleted, wasn't found.
   * @example ```javascript
   *  const rawClaim = {
   *   name: 'Alice',
   *   age: 29,
   * };
   * const claim = new Claim(ctype, rawClaim, alice);
   * const reqForAtt = new RequestForAttestation(claim, [], alice);
   * reqForAtt.removeClaimProperties(['name']);
   * // reqForAtt does not contain name in its claimHashTree and its claim contents anymore.
   * // RequestForAttestation does not contain name in its claimHashTree and its claim contents anymore.
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
   * Removes the [[Claim]] Owner from the [[RequestForAttestation]] object, provides an option to **exclude** the [[Claim]] owner in the [[createPresentation]] method.
   *
   * @example ```javascript
   * const reqForAtt = new RequestForAttestation(claim, [], alice);
   * reqForAtt.removeClaimOwner();
   * // RequestForAttestation does not conatin the claim owner or the nonce anymore.
   * ```
   */
  public removeClaimOwner(): void {
    delete this.claim.owner
    delete this.claimOwner.nonce
  }

  /**
   * Verifies the data of the [[RequestForAttestation]] object.
   *
   * @returns Whether verifying the data inside the object was successful.
   * @example ```javascript
   *  const reqForAtt = new RequestForAttestation(claim, [], alice);
   * reqForAtt.verifyData();
   * // returns true
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
    Object.keys(this.claim.contents).forEach(key => {
      const value = this.claim.contents[key]
      if (!this.claimHashTree[key]) {
        throw Error(`Property '${key}' not in claim hash tree`)
      }
      const hashed: NonceHash = this.claimHashTree[key]
      if (hashed.hash !== hashNonceValue(hashed.nonce, value)) {
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
   * Verifies the signature inside the [[RequestForAttestation]] object, an unsuccessful signature will stop the Tx (Transaction).
   *
   * @returns Whether the verification of the claimers signature was successful.
   * @example ```javascript
   * const reqForAtt = new RequestForAttestation(claim, [], alice);
   * reqForAtt.verifySignature();
   * // returns true
   * ```
   */
  public verifySignature(): boolean {
    return verifyClaimerSignature(this)
  }

  private getHashLeaves(): Uint8Array[] {
    const result: Uint8Array[] = []
    result.push(coToUInt8(this.claimOwner.hash))
    result.push(coToUInt8(this.ctypeHash.hash))
    Object.keys(this.claimHashTree).forEach(key => {
      result.push(coToUInt8(this.claimHashTree[key].hash))
    })
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

  private sign(identity: Identity): string {
    return identity.signStr(this.hash)
  }
}

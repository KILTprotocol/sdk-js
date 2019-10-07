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
import IAttestedClaim from '../types/AttestedClaim'

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
  return verify(rfa.rootHash, rfa.claimerSignature, rfa.claim.owner)
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
   * @example
   * ```javascript
   * // create an RequestForAttestation object, so we can call methods on it (`serialized` is a serialized RequestForAttestation object)
   * RequestForAttestation.fromObject(JSON.parse(serialized));
   * ```
   */
  public static fromObject(obj: IRequestForAttestation): RequestForAttestation {
    return new RequestForAttestation(
      obj.claim,
      obj.legitimations,
      undefined,
      obj.claimOwner,
      obj.claimerSignature,
      obj.claimHashTree,
      obj.ctypeHash,
      obj.rootHash,
      obj.delegationId
    )
  }

  public claim: IClaim
  public claimOwner: NonceHash
  public claimerSignature: string
  public claimHashTree: object
  public ctypeHash: NonceHash
  public rootHash: Hash
  public legitimations: AttestedClaim[]

  public delegationId?: IDelegationBaseNode['id']

  /**
   * Builds a new [[RequestForAttestation]] instance.
   *
   * @param claim - A claim, usually sent by a claimer.
   * @param legitimations - Attested claims used as legitimations.
   * @param identity - Identity of the claimer.
   * @param delegationId - A delegation tree's root node id.
   * @example
   * ```javascript
   * // create a new request for attestation
   * new RequestForAttestation(claim, [], alice);
   * ```
   */
  public constructor(
    claim: IClaim,
    legitimations: IAttestedClaim[],
    identity?: Identity,
    claimOwner?: NonceHash,
    claimerSignature?: string,
    claimHashTree?: object,
    ctypeHash?: NonceHash,
    rootHash?: Hash,
    delegationId?: IDelegationBaseNode['id']
  ) {
    if (identity !== undefined) {
      if (claim.owner !== identity.address) {
        throw Error('Claim owner is not identity')
      }
      this.claim = claim
      this.claimOwner = generateHash(this.claim.owner)
      this.ctypeHash = generateHash(this.claim.cTypeHash)
      this.legitimations = legitimations.map((legitimation: IAttestedClaim) =>
        AttestedClaim.fromObject(JSON.parse(
          JSON.stringify(legitimation)
        ) as IAttestedClaim)
      )
      this.delegationId = delegationId

      this.claimHashTree = generateHashTree(claim.contents)
      this.rootHash = this.calculateRootHash()
      this.claimerSignature = this.sign(identity)
    } else if (
      claimerSignature !== undefined &&
      claimOwner !== undefined &&
      ctypeHash !== undefined &&
      claimHashTree !== undefined &&
      rootHash !== undefined
    ) {
      this.claim = claim
      this.claimOwner = claimOwner
      this.ctypeHash = ctypeHash
      this.legitimations = legitimations.map((legitimation: IAttestedClaim) =>
        AttestedClaim.fromObject(JSON.parse(
          JSON.stringify(legitimation)
        ) as IAttestedClaim)
      )
      this.delegationId = delegationId

      this.claimHashTree = claimHashTree
      this.rootHash = rootHash
      this.claimerSignature = claimerSignature
    } else {
      throw Error('Signature Mismatch')
    }
  }

  /**
   * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
   *
   * @param properties - Properties to remove from the [[Claim]] object.
   * @throws An error when a property which should be deleted wasn't found.
   * @example
   * ```javascript
   *  requestForAttestation.removeClaimProperties(['name']);
   * // `name` is deleted from `requestForAttestation`
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
   * @example
   * ```javascript
   * requestForAttestation.removeClaimOwner();
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
   * @example
   * ```javascript
   *  requestForAttestation.verifyData();
   * // returns `true` if the data is correct
   * ```
   */
  public verifyData(): boolean {
    // check claim hash
    if (this.rootHash !== this.calculateRootHash()) {
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
      hashNonceValue(this.ctypeHash.nonce, this.claim.cTypeHash)
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
   * Verifies the signature of the [[RequestForAttestation]] object.
   *
   * @returns Whether the signature is correct.
   * @example
   * ```javascript
   * requestForAttestation.verifySignature();
   * // returns `true` if the signature is correct
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
    return identity.signStr(this.rootHash)
  }
}

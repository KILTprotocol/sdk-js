/**
 * @module Claim
 */
import { v4 as uuid } from 'uuid'
import { verify, hashStr, hash } from '../crypto/Crypto'
import MerkleTree from 'merkletreejs'

import Identity from '../identity/Identity'
import IClaim from '../claim/Claim'
import AttestedClaim from '../attestedclaim/AttestedClaim'

function hashNonceValue(nonce: string, value: any) {
  return hashStr(nonce + JSON.stringify(value)).substr(2) // cut off "0x",
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

function hashing(data: any): Buffer {
  return new Buffer(hash(data))
}

type NonceHash = {
  nonce: string
  hash: string
}

export interface IRequestForAttestation {
  claim: IClaim
  ctypeHash: NonceHash
  claimHashTree: object
  legitimations: AttestedClaim[]
  hash: string
  claimerSignature: string
}

export default class RequestForAttestation implements IRequestForAttestation {
  public static fromObject(obj: IRequestForAttestation): RequestForAttestation {
    const newClaim = Object.create(RequestForAttestation.prototype)
    return Object.assign(newClaim, obj)
  }

  public claim: IClaim
  public ctypeHash: NonceHash
  public claimHashTree: object
  public legitimations: AttestedClaim[]
  public hash: string
  public claimerSignature: string

  constructor(
    claim: IClaim,
    legitimations: AttestedClaim[],
    identity: Identity
  ) {
    if (claim.owner !== identity.address) {
      throw Error('Claim owner is not identity')
    }
    this.claim = claim
    this.ctypeHash = generateHash(this.claim.ctype)
    this.legitimations = legitimations

    this.claimHashTree = generateHashTree(claim.contents)
    this.hash = this.calculateRootHash()
    this.claimerSignature = this.sign(identity)
  }

  public removeClaimProperties(properties: string[]) {
    properties.forEach(key => {
      if (!this.claimHashTree.hasOwnProperty(key)) {
        throw Error(`Property '${key}' not found in claim`)
      }
      delete this.claim.contents[key]
      delete this.claimHashTree[key].nonce
    })
  }

  public verifyData(): boolean {
    // check claim hash
    if (this.hash !== this.calculateRootHash()) {
      return false
    }
    // check ctype hash
    if (
      this.ctypeHash.hash !==
      hashNonceValue(this.ctypeHash.nonce, this.claim.ctype)
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

  public verifySignature(): boolean {
    return verifyClaimerSignature(this)
  }

  private getHashLeafs(): Buffer[] {
    const result: Buffer[] = []
    result.push(new Buffer(this.ctypeHash.hash, 'hex'))
    for (const key of Object.keys(this.claimHashTree)) {
      result.push(new Buffer(this.claimHashTree[key].hash, 'hex'))
    }
    if (this.legitimations) {
      this.legitimations.forEach(legitimation => {
        result.push(new Buffer(legitimation.getHash(), 'hex'))
      })
    }

    return result
  }

  private calculateRootHash(): string {
    const hashes: Buffer[] = this.getHashLeafs()
    const root: Buffer =
      hashes.length === 1
        ? hashes[0]
        : new MerkleTree(this.getHashLeafs(), hashing).getRoot()
    return root.toString('hex')
  }

  private sign(identity: Identity) {
    return identity.signStr(this.hash)
  }
}

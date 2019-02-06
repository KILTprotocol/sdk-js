/**
 * @module Claim
 */
import { v4 as uuid } from 'uuid'
import { verify, hashStr } from '../crypto/Crypto'

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

function getRoot(leaves: Hash[]): Hash {
  let result = leaves[0]
  if (leaves.length === 1) {
    return result
  } else {
    for (let i = 1; i < leaves.length; i++) {
      result += leaves[i]
    }
    return hashStr(result)
  }
}

type Hash = string

type NonceHash = {
  nonce: string
  hash: Hash
}

export interface IRequestForAttestation {
  claim: IClaim
  ctypeHash: NonceHash
  claimHashTree: object
  legitimations: AttestedClaim[]
  hash: Hash
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
  public hash: Hash
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

  private getHashLeaves(): Hash[] {
    const result: Hash[] = []
    result.push(this.ctypeHash.hash)
    for (const key of Object.keys(this.claimHashTree)) {
      result.push(this.claimHashTree[key].hash)
    }
    if (this.legitimations) {
      this.legitimations.forEach(legitimation => {
        result.push(legitimation.getHash())
      })
    }

    return result
  }

  private calculateRootHash(): Hash {
    const hashes: Hash[] = this.getHashLeaves()
    const root: Hash =
      hashes.length === 1 ? hashes[0] : getRoot(this.getHashLeaves())
    return root
  }

  private sign(identity: Identity) {
    return identity.signStr(this.hash)
  }
}

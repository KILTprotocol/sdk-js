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
  public static fromObject(obj: IRequestForAttestation): RequestForAttestation {
    const newClaim = Object.create(RequestForAttestation.prototype)
    const object = Object.assign(newClaim, obj)
    object.legitimations = object.legitimations.map(
      (legitimation: AttestedClaim) => AttestedClaim.fromObject(legitimation)
    )
    return object
  }

  public claim: IClaim
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
    this.ctypeHash = generateHash(this.claim.cType)
    this.legitimations = legitimations
    this.delegationId = delegationId

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

  public verifySignature(): boolean {
    return verifyClaimerSignature(this)
  }

  private getHashLeaves(): Uint8Array[] {
    const result: Uint8Array[] = []
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

/**
 * Requests for attestation are a core building block of the KILT SDK.
 * A RequestForAttestation represents a [[Claim]] which needs to be validated. In practice, the RequestForAttestation is sent from a claimer to an attester.
 *
 * A RequestForAttestation object contains the [[Claim]] and its hash, and legitimations/delegationId of the attester.
 * It's signed by the claimer, to make it tamper-proof (`claimerSignature` is a property of [[Claim]]).
 * A RequestForAttestation also supports hiding of claim data during a credential presentation.
 *
 * @packageDocumentation
 * @module RequestForAttestation
 * @preferred
 */
import { v4 as uuid } from 'uuid'
import { validateLegitimations, validateNonceHash } from '../util/DataUtils'
import {
  AttesterPublicKey,
  AttestationRequest,
  ClaimerAttestationSession,
} from '@kiltprotocol/portablegabi'
import { IInitiateAttestation } from '../messaging/Message'
import {
  verify,
  hash,
  coToUInt8,
  u8aToHex,
  u8aConcat,
  hashObjectAsStr,
} from '../crypto/Crypto'

import Identity from '../identity/Identity'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import RequestForAttestationUtils from './RequestForAttestation.utils'
import IRequestForAttestation, {
  Hash,
  NonceHash,
  NonceHashTree,
  CompressedRequestForAttestation,
} from '../types/RequestForAttestation'
import { IDelegationBaseNode } from '../types/Delegation'
import IClaim from '../types/Claim'
import Claim from '../claim/Claim'
import IAttestedClaim from '../types/AttestedClaim'

function hashNonceValue(
  nonce: string,
  value: string | object | number | boolean
): string {
  return hashObjectAsStr(value, nonce)
}

function generateHash(value: string | object): NonceHash {
  const nonce: string = uuid()
  return {
    nonce,
    hash: hashNonceValue(nonce, value),
  }
}

function generateHashTree(contents: IClaim['contents']): NonceHashTree {
  const result: NonceHashTree = {}

  Object.keys(contents).forEach(key => {
    result[key] = generateHash(contents[key].toString())
  })

  return result
}

function verifyClaimerSignature(reqForAtt: IRequestForAttestation): boolean {
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

export type Options = {
  legitimations?: AttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  initiateAttestationMsg?: IInitiateAttestation
  attesterPubKey?: AttesterPublicKey
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
   * [STATIC] Builds a new instance of [[RequestForAttestation]], from a complete set of required parameters.
   *
   * @param claim An `IClaim` object the request for attestation is built for.
   * @param identity The Claimer's [[Identity]].
   * @param option Container for different options that can be passed to this method.
   * @param option.legitimations Array of [[AttestedClaim]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
   * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
   * @param option.initiateAttestationMsg The message object which was created during the initiation of the attestation in [[initiateAttestation]].
   * @param option.attesterPubKey The privacy enhanced public key of the Attester.
   * @throws When claimInput's owner address does not match the supplied identity's address.
   * @returns A new [[RequestForAttestation]] object.
   * @example ```javascript
   * const input = RequestForAttestation.fromClaimAndIdentity(claim, alice);
   * ```
   */
  public static async fromClaimAndIdentity(
    claim: IClaim,
    identity: Identity,
    {
      legitimations,
      delegationId,
      initiateAttestationMsg,
      attesterPubKey,
    }: Options = {}
  ): Promise<{
    message: RequestForAttestation
    session: ClaimerAttestationSession | null
  }> {
    if (claim.owner !== identity.getAddress()) {
      throw Error('Claim owner is not Identity')
    }

    let peRequest: AttestationRequest | null = null
    let session: ClaimerAttestationSession | null = null
    if (
      typeof initiateAttestationMsg !== 'undefined' &&
      typeof attesterPubKey !== 'undefined'
    ) {
      const rawClaim: { [id: string]: any } = {
        claim,
      }
      if (typeof legitimations !== 'undefined') {
        rawClaim.legitimations = legitimations
      }
      if (typeof delegationId !== 'undefined') {
        rawClaim.delegationId = delegationId
      }
      const peSessionMessage = await identity.claimer.requestAttestation({
        claim: rawClaim,
        startAttestationMsg: initiateAttestationMsg.content,
        attesterPubKey,
      })
      peRequest = peSessionMessage.message
      session = peSessionMessage.session
    }

    const claimOwnerGenerated = generateHash(claim.owner)
    const cTypeHashGenerated = generateHash(claim.cTypeHash)
    const claimHashTreeGenerated = generateHashTree(claim.contents)
    const calculatedRootHash = RequestForAttestation.calculateRootHash(
      claimOwnerGenerated,
      cTypeHashGenerated,
      claimHashTreeGenerated,
      legitimations || [],
      delegationId || null
    )

    return {
      message: new RequestForAttestation({
        claim,
        legitimations: legitimations || [],
        claimOwner: claimOwnerGenerated,
        claimHashTree: claimHashTreeGenerated,
        cTypeHash: cTypeHashGenerated,
        rootHash: calculatedRootHash,
        claimerSignature: RequestForAttestation.sign(
          identity,
          calculatedRootHash
        ),
        delegationId: delegationId || null,
        privacyEnhancement: peRequest,
      }),
      session,
    }
  }

  public static isIRequestForAttestation(
    // ugh that function name... how do we want to call these typeguards?
    input: Partial<IRequestForAttestation>
  ): input is IRequestForAttestation {
    if (!input.claim || !Claim.isIClaim(input.claim)) {
      throw new Error('Claim not provided')
    }
    if (!input.legitimations || !Array.isArray(input.legitimations)) {
      throw new Error('Legitimations not provided')
    }
    if (!input.claimHashTree) {
      throw new Error('Claim Hash Tree not provided')
    } else {
      Object.keys(input.claimHashTree).forEach(key => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!input.claimHashTree![key].hash) {
          throw new Error('incomplete claim Hash Tree')
        }
      })
    }
    // TODO: implement verification of delegationId once chain connection is established
    if (
      typeof input.delegationId !== 'string' &&
      !input.delegationId === null
    ) {
      throw new Error('DelegationId not provided')
    }
    return RequestForAttestation.verifyData(input as IRequestForAttestation)
  }

  public claim: IClaim
  public legitimations: AttestedClaim[]
  public claimOwner: NonceHash
  public claimerSignature: string
  public claimHashTree: NonceHashTree
  public cTypeHash: NonceHash
  public rootHash: Hash
  public privacyEnhancement: AttestationRequest | null
  public delegationId: IDelegationBaseNode['id'] | null

  /**
   * Builds a new [[RequestForAttestation]] instance.
   *
   * @param requestForAttestationInput - The base object from which to create the input.
   * @example ```javascript
   * // create a new request for attestation
   * const reqForAtt = new RequestForAttestation(requestForAttestationInput);
   * ```
   */
  public constructor(requestForAttestationInput: IRequestForAttestation) {
    RequestForAttestation.isIRequestForAttestation(requestForAttestationInput)
    this.claim = requestForAttestationInput.claim
    this.claimOwner = requestForAttestationInput.claimOwner
    this.cTypeHash = requestForAttestationInput.cTypeHash
    if (
      requestForAttestationInput.legitimations &&
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
    this.privacyEnhancement = requestForAttestationInput.privacyEnhancement
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
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity({
   *   claim,
   *   identity: alice,
   * });
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
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity({
   *   claim,
   *   identity: alice,
   * });
   * reqForAtt.removeClaimOwner();
   * // `input` does not contain the claim `owner` or the `claimOwner`'s nonce anymore.
   * ```
   */
  public removeClaimOwner(): void {
    delete this.claim.owner
    delete this.claimOwner.nonce
  }

  /**
   * Verifies the data of the [[RequestForAttestation]] object; used to check that the data was not tampered with, by checking the data against hashes.
   *
   * @param input - The [[RequestForAttestation]] for which to verify data.
   * @returns Whether the data is valid.
   * @throws When any key of the claim contents could not be found in the claimHashTree.
   * @throws When either the rootHash or the signature are not verifiable.
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity(claim, alice);
   * reqForAtt.verifyData(); // returns true if the data is correct
   * ```
   */
  public static verifyData(input: IRequestForAttestation): boolean {
    // check claim owner hash
    validateNonceHash(input.claimOwner, input.claim.owner, 'Claim Owner')

    // check cType hash
    validateNonceHash(input.cTypeHash, input.claim.cTypeHash, 'Claim CType')

    // check all hashes for provided claim properties
    Object.keys(input.claim.contents).forEach(key => {
      const value = input.claim.contents[key]
      if (!input.claimHashTree[key]) {
        throw Error(`Property '${key}' not in claim hash tree`)
      }
      const hashed: NonceHash = input.claimHashTree[key]
      validateNonceHash(hashed, value, `hash tree property ${key}`)
    })

    // check legitimations
    validateLegitimations(input.legitimations)

    // check claim hash
    if (!RequestForAttestation.verifyRootHash(input)) {
      throw new Error('Provided rootHash does not correspond to data')
    }
    // check signature
    if (!RequestForAttestation.verifySignature(input)) {
      throw new Error('Provided Signature not verifiable')
    }

    return true
  }

  public verifyData(): boolean {
    return RequestForAttestation.verifyData(this)
  }

  /**
   * Verifies the signature of the [[RequestForAttestation]] object.
   *
   * @param input - [[RequestForAttestation]] .
   * @returns Whether the signature is correct.
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaimAndIdentity({
   *   claim,
   *   identity: alice,
   * });
   * reqForAtt.verifySignature(); // returns `true` if the signature is correct
   * ```
   */
  public static verifySignature(input: IRequestForAttestation): boolean {
    return verifyClaimerSignature(input)
  }

  public verifySignature(): boolean {
    return RequestForAttestation.verifySignature(this)
  }

  public static verifyRootHash(input: IRequestForAttestation): boolean {
    return (
      input.rootHash ===
      RequestForAttestation.calculateRootHash(
        input.claimOwner,
        input.cTypeHash,
        input.claimHashTree,
        input.legitimations,
        input.delegationId
      )
    )
  }

  public verifyRootHash(): boolean {
    return RequestForAttestation.verifyRootHash(this)
  }

  private static sign(identity: Identity, rootHash: Hash): string {
    return identity.signStr(rootHash)
  }

  private static getHashLeaves(
    claimOwner: NonceHash,
    cTypeHash: NonceHash,
    claimHashTree: NonceHashTree,
    legitimations: IAttestedClaim[],
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
        result.push(coToUInt8(legitimation.attestation.claimHash))
      })
    }
    if (delegationId) {
      result.push(coToUInt8(delegationId))
    }

    return result
  }

  /**
   * Compresses an [[RequestForAttestation]] object.
   *
   * @returns An array that contains the same properties of an [[RequestForAttestation]].
   */
  public compress(): CompressedRequestForAttestation {
    return RequestForAttestationUtils.compress(this)
  }

  /**
   * [STATIC] Builds an [[RequestForAttestation]] from the decompressed array.
   *
   * @param reqForAtt The [[CompressedRequestForAttestation]] that should get decompressed.
   * @returns A new [[RequestForAttestation]] object.
   */
  public static decompress(
    reqForAtt: CompressedRequestForAttestation
  ): RequestForAttestation {
    const decompressedRequestForAttestation = RequestForAttestationUtils.decompress(
      reqForAtt
    )
    return RequestForAttestation.fromRequest(decompressedRequestForAttestation)
  }

  private static calculateRootHash(
    claimOwner: NonceHash,
    cTypeHash: NonceHash,
    claimHashTree: NonceHashTree,
    legitimations: IAttestedClaim[],
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

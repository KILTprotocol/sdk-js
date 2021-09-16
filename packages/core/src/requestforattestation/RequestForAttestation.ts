/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

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
 */

import type {
  IRequestForAttestation,
  CompressedRequestForAttestation,
  Hash,
  IDelegationNode,
  IClaim,
  IAttestedClaim,
  IDidKeyDetails,
  KeystoreSigner,
  IDidDetails,
  IDidResolver,
  DidSignature,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { DefaultResolver, DidUtils } from '@kiltprotocol/did'
import ClaimUtils from '../claim/Claim.utils'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import RequestForAttestationUtils from './RequestForAttestation.utils'

function makeSigningData(
  input: IRequestForAttestation,
  challenge?: string
): Uint8Array {
  return new Uint8Array([
    ...Crypto.coToUInt8(input.rootHash),
    ...Crypto.coToUInt8(challenge),
  ])
}

function getHashRoot(leaves: Uint8Array[]): Uint8Array {
  const result = Crypto.u8aConcat(...leaves)
  return Crypto.hash(result)
}

export type Options = {
  legitimations?: AttestedClaim[]
  delegationId?: IDelegationNode['id']
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
   * @param option Container for different options that can be passed to this method.
   * @param option.legitimations Array of [[AttestedClaim]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
   * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
   * @returns A new [[RequestForAttestation]] object.
   * @example ```javascript
   * const input = RequestForAttestation.fromClaim(claim);
   * ```
   */
  public static fromClaim(
    claim: IClaim,
    { legitimations, delegationId }: Options = {}
  ): RequestForAttestation {
    const {
      hashes: claimHashes,
      nonceMap: claimNonceMap,
    } = ClaimUtils.hashClaimContents(claim)

    const rootHash = RequestForAttestation.calculateRootHash({
      legitimations,
      claimHashes,
      delegationId,
    })

    // signature will be added afterwards!
    return new RequestForAttestation({
      claim,
      legitimations: legitimations || [],
      claimHashes,
      claimNonceMap,
      rootHash,
      delegationId: delegationId || null,
    })
  }

  /**
   * [STATIC] Custom Type Guard to determine input being of type IRequestForAttestation..
   *
   * @param input - A potentially only partial [[IRequestForAttestation]].
   *
   * @returns  Boolean whether input is of type IRequestForAttestation.
   */
  public static isIRequestForAttestation(
    input: unknown
  ): input is IRequestForAttestation {
    try {
      RequestForAttestationUtils.errorCheck(input as IRequestForAttestation)
    } catch (error) {
      return false
    }
    return true
  }

  public claim: IClaim
  public legitimations: AttestedClaim[]
  public claimerSignature?: DidSignature & { challenge?: string }
  public claimHashes: string[]
  public claimNonceMap: Record<string, string>
  public rootHash: Hash
  public delegationId: IDelegationNode['id'] | null

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
    RequestForAttestationUtils.errorCheck(requestForAttestationInput)
    this.claim = requestForAttestationInput.claim
    this.claimHashes = requestForAttestationInput.claimHashes
    this.claimNonceMap = requestForAttestationInput.claimNonceMap
    if (
      requestForAttestationInput.legitimations &&
      Array.isArray(requestForAttestationInput.legitimations) &&
      requestForAttestationInput.legitimations.length
    ) {
      this.legitimations = requestForAttestationInput.legitimations.map(
        (legitimation) => AttestedClaim.fromAttestedClaim(legitimation)
      )
    } else {
      this.legitimations = []
    }
    this.delegationId = requestForAttestationInput.delegationId
    this.rootHash = requestForAttestationInput.rootHash
    this.claimerSignature = requestForAttestationInput.claimerSignature
    this.verifyData()
  }

  /**
   * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
   *
   * @param properties - Properties to remove from the [[Claim]] object.
   * @throws [[ERROR_CLAIM_HASHTREE_MISMATCH]] when a property which should be deleted wasn't found.
   * @example ```javascript
   * const rawClaim = {
   *   name: 'Alice',
   *   age: 29,
   * };
   * const claim = Claim.fromCTypeAndClaimContents(ctype, rawClaim, alice);
   * const reqForAtt = RequestForAttestation.fromClaim(
   *   claim,
   * );
   * reqForAtt.removeClaimProperties(['name']);
   * // reqForAtt does not contain `name` in its claimHashTree and its claim contents anymore.
   * ```
   */
  public removeClaimProperties(properties: string[]): void {
    properties.forEach((key) => {
      delete this.claim.contents[key]
    })
    this.claimNonceMap = ClaimUtils.hashClaimContents(this.claim, {
      nonces: this.claimNonceMap,
    }).nonceMap
  }

  /**
   * Verifies the data of the [[RequestForAttestation]] object; used to check that the data was not tampered with, by checking the data against hashes.
   *
   * @param input - The [[RequestForAttestation]] for which to verify data.
   * @returns Whether the data is valid.
   * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] when any key of the claim contents could not be found in the claimHashTree.
   * @throws [[ERROR_ROOT_HASH_UNVERIFIABLE]] when the rootHash is not verifiable.
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaim(claim);
   * RequestForAttestation.verifyData(reqForAtt); // returns true if the data is correct
   * ```
   */
  public static verifyData(input: IRequestForAttestation): boolean {
    // check claim hash
    if (!RequestForAttestation.verifyRootHash(input)) {
      throw SDKErrors.ERROR_ROOT_HASH_UNVERIFIABLE()
    }

    // verify properties against selective disclosure proof
    const verificationResult = ClaimUtils.verifyDisclosedAttributes(
      input.claim,
      {
        nonces: input.claimNonceMap,
        hashes: input.claimHashes,
      }
    )
    // TODO: how do we want to deal with multiple errors during claim verification?
    if (!verificationResult.verified)
      throw verificationResult.errors[0] || SDKErrors.ERROR_CLAIM_UNVERIFIABLE()

    // check legitimations
    AttestedClaim.validateLegitimations(input.legitimations)

    return true
  }

  public verifyData(): boolean {
    return RequestForAttestation.verifyData(this)
  }

  /**
   * Verifies the signature of the [[RequestForAttestation]] object.
   *
   * @param input - [[RequestForAttestation]].
   * @param verificationOpts
   * @param verificationOpts.claimerDid - The claimer's identity as an [[IDidDetails]] object.
   * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity if it is not passed in.
   * Defaults to the DefaultResolver.
   * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
   * @throws [[ERROR_IDENTITY_MISMATCH]] if the DidDetails do not match the claim owner.
   * @returns Whether the signature is correct.
   * @example ```javascript
   * const reqForAtt = RequestForAttestation.fromClaim(
   * claim,
   * );
   * await reqForAtt.signWithDid(myKeystore, myDidDetails)
   * RequestForAttestation.verifySignature(reqForAtt, myDidDetails); // returns `true` if the signature is correct
   * ```
   */
  public static async verifySignature(
    input: IRequestForAttestation,
    claimerDid: IDidDetails['did'],
    {
      challenge,
      resolver = DefaultResolver,
    }: {
      resolver?: IDidResolver
      challenge?: string
    }
  ): Promise<boolean> {
    const { claimerSignature } = input
    if (!claimerSignature) return false
    if (challenge && challenge !== claimerSignature.challenge) return false
    const verifyData = makeSigningData(input, claimerSignature.challenge)
    const { verified, didDetails } = await DidUtils.verifyDidSignature({
      ...claimerSignature,
      message: verifyData,
      did: claimerDid,
      keyRelationship: KeyRelationship.authentication,
      resolver,
    })
    if (input.claim.owner !== didDetails?.did) {
      throw SDKErrors.ERROR_IDENTITY_MISMATCH()
    }
    return verified
  }

  public async verifySignature(
    claimerDid: IDidDetails['did'],
    resolverOpts: {
      resolver?: IDidResolver
      challenge?: string
    }
  ): Promise<boolean> {
    return RequestForAttestation.verifySignature(this, claimerDid, resolverOpts)
  }

  public static verifyRootHash(input: IRequestForAttestation): boolean {
    return input.rootHash === RequestForAttestation.calculateRootHash(input)
  }

  public verifyRootHash(): boolean {
    return RequestForAttestation.verifyRootHash(this)
  }

  public async addSignature(
    sig: string | Uint8Array,
    keyId: string,
    challenge?: string
  ): Promise<this> {
    const signature = typeof sig === 'string' ? sig : Crypto.u8aToHex(sig)
    this.claimerSignature = { signature, keyId, challenge }
    return this
  }

  public async signWithDid(
    signer: KeystoreSigner,
    did: IDidDetails,
    challenge?: string
  ): Promise<this> {
    const { signature, keyId } = await DidUtils.signWithDid(
      makeSigningData(this, challenge),
      did,
      signer,
      KeyRelationship.authentication
    )
    return this.addSignature(signature, keyId, challenge)
  }

  public async signWithKey(
    signer: KeystoreSigner<string>,
    key: IDidKeyDetails,
    challenge?: string
  ): Promise<this> {
    const { signature } = await DidUtils.signWithKey(
      makeSigningData(this, challenge),
      key,
      signer
    )
    return this.addSignature(signature, key.id, challenge)
  }

  private static getHashLeaves(
    claimHashes: Hash[],
    legitimations: IAttestedClaim[],
    delegationId: IDelegationNode['id'] | null
  ): Uint8Array[] {
    const result: Uint8Array[] = []
    claimHashes.forEach((item) => {
      result.push(Crypto.coToUInt8(item))
    })
    if (legitimations) {
      legitimations.forEach((legitimation) => {
        result.push(Crypto.coToUInt8(legitimation.attestation.claimHash))
      })
    }
    if (delegationId) {
      result.push(Crypto.coToUInt8(delegationId))
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
    request: Partial<IRequestForAttestation>
  ): Hash {
    const hashes: Uint8Array[] = RequestForAttestation.getHashLeaves(
      request.claimHashes || [],
      request.legitimations || [],
      request.delegationId || null
    )
    const root: Uint8Array = getHashRoot(hashes)
    return Crypto.u8aToHex(root)
  }
}

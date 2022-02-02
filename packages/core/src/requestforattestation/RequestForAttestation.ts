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
  IClaim,
  DidKey,
  KeystoreSigner,
  IDidResolver,
  DidPublicKey,
  IDelegationNode,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { DidResolver, DidDetails, DidUtils } from '@kiltprotocol/did'
import * as ClaimUtils from '../claim/Claim.utils.js'
import * as RequestForAttestationUtils from './RequestForAttestation.utils.js'
import { Credential } from '../credential/Credential.js'

function makeSigningData(
  input: IRequestForAttestation,
  challenge?: string
): Uint8Array {
  return new Uint8Array([
    ...Crypto.coToUInt8(input.rootHash),
    ...Crypto.coToUInt8(challenge),
  ])
}

export type Options = {
  legitimations?: Credential[]
  delegationId?: IDelegationNode['id']
}

/**
 * [STATIC] Clones a [[RequestForAttestation]] object.
 * Verifies data integrity while doing so.
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
export function fromRequest(
  requestForAttestationInput: IRequestForAttestation
): IRequestForAttestation {
  const copy = JSON.parse(JSON.stringify(requestForAttestationInput))
  RequestForAttestationUtils.errorCheck(copy)
  RequestForAttestationUtils.verifyData(copy)
  return copy
}

/**
 * [STATIC] Builds a new [[RequestForAttestation]] object, from a complete set of required parameters.
 *
 * @param claim An `IClaim` object the request for attestation is built for.
 * @param option Container for different options that can be passed to this method.
 * @param option.legitimations Array of [[Credential]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new [[RequestForAttestation]] object.
 * @example ```javascript
 * const input = RequestForAttestation.fromClaim(claim);
 * ```
 */
export function fromClaim(
  claim: IClaim,
  { legitimations, delegationId }: Options = {}
): IRequestForAttestation {
  const { hashes: claimHashes, nonceMap: claimNonceMap } =
    ClaimUtils.hashClaimContents(claim)

  const rootHash = RequestForAttestationUtils.calculateRootHash({
    legitimations,
    claimHashes,
    delegationId,
  })

  // signature will be added afterwards!
  return fromRequest({
    claim,
    legitimations: legitimations || [],
    claimHashes,
    claimNonceMap,
    rootHash,
    delegationId: delegationId || null,
  })
}

/**
 * [STATIC] [ASYNC] Verifies the signature of the [[RequestForAttestation]] object.
 * It supports migrated DIDs, meaning that if the original claim within the [[RequestForAttestation]] included a light DID that was afterwards upgraded,
 * the signature over the presentation **must** be generated with the full DID in order for the verification to be successful.
 * On the other hand, a light DID that has been migrated and then deleted from the chain will not be allowed to generate valid presentations anymore.
 *
 * @param input - The [[RequestForAttestation]].
 * @param verificationOpts Additional options to retrieve the details from the identifiers inside the request for attestation.
 * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
 * @throws [[ERROR_IDENTITY_MISMATCH]] if the DidDetails do not match the claim owner or if the light DID is used after it has been upgraded.
 * @returns Whether the signature is correct.
 * @example ```javascript
 * const reqForAtt = RequestForAttestation.fromClaim(claim);
 * await reqForAtt.signWithDid(myKeystore, myDidDetails);
 * RequestForAttestation.verifySignature(reqForAtt); // returns `true` if the signature is correct
 * ```
 */
export async function verifySignature(
  input: IRequestForAttestation,
  {
    challenge,
    resolver = DidResolver,
  }: {
    challenge?: string
    resolver?: IDidResolver
  } = {}
): Promise<boolean> {
  const { claimerSignature } = input
  if (!claimerSignature) return false
  if (challenge && challenge !== claimerSignature.challenge) return false
  const signingData = makeSigningData(input, claimerSignature.challenge)
  const { verified } = await DidUtils.verifyDidSignature({
    signature: claimerSignature,
    message: signingData,
    expectedVerificationMethod: KeyRelationship.authentication,
    resolver,
  })
  return verified
}

/**
 * [STATIC] Custom Type Guard to determine input being of type IRequestForAttestation..
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 *
 * @returns  Boolean whether input is of type IRequestForAttestation.
 */
export function isIRequestForAttestation(
  input: unknown
): input is IRequestForAttestation {
  try {
    RequestForAttestationUtils.errorCheck(input as IRequestForAttestation)
  } catch (error) {
    return false
  }
  return true
}

/**
 * [STATIC] Builds an [[RequestForAttestation]] from the decompressed array.
 *
 * @param reqForAtt The [[CompressedRequestForAttestation]] that should get decompressed.
 * @returns A new [[RequestForAttestation]] object.
 */
export function decompress(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  const decompressedRequestForAttestation =
    RequestForAttestationUtils.decompress(reqForAtt)
  return fromRequest(decompressedRequestForAttestation)
}

/**
 * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
 *
 * @param req4Att - The RequestForAttestation object to remove properties from.
 * @param properties - Properties to remove from the [[Claim]] object.
 * @throws [[ERROR_CLAIM_HASHTREE_MISMATCH]] when a property which should be deleted wasn't found.
 * @example ```javascript
 * const rawClaim = {
 *   name: 'Alice',
 *   age: 29,
 * };
 * const claim = Claim.fromCTypeAndClaimContents(ctype, rawClaim, alice);
 * const reqForAtt = RequestForAttestation.fromClaim(claim);
 * RequestForAttestation.removeClaimProperties(reqForAtt, ['name']);
 * // reqForAtt does not contain `name` in its claimHashTree and its claim contents anymore.
 * ```
 */
export function removeClaimProperties(
  req4Att: IRequestForAttestation,
  properties: string[]
): void {
  properties.forEach((key) => {
    // eslint-disable-next-line no-param-reassign
    delete req4Att.claim.contents[key]
  })
  // eslint-disable-next-line no-param-reassign
  req4Att.claimNonceMap = ClaimUtils.hashClaimContents(req4Att.claim, {
    nonces: req4Att.claimNonceMap,
  }).nonceMap
}

export async function addSignature(
  req4Att: IRequestForAttestation,
  sig: string | Uint8Array,
  keyId: DidPublicKey['id'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const signature = typeof sig === 'string' ? sig : Crypto.u8aToHex(sig)
  // eslint-disable-next-line no-param-reassign
  req4Att.claimerSignature = { signature, keyId, challenge }
}

export async function signWithDidKey(
  req4Att: IRequestForAttestation,
  signer: KeystoreSigner,
  didDetails: DidDetails,
  keyId: DidKey['id'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const { signature, keyId: signatureKeyId } = await didDetails.signPayload(
    makeSigningData(req4Att, challenge),
    signer,
    keyId
  )
  return addSignature(req4Att, signature, signatureKeyId, { challenge })
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
 */

import type {
  CompressedCredential,
  CompressedRequestForAttestation,
  DidPublicKey,
  DidVerificationKey,
  Hash,
  IClaim,
  ICredential,
  ICType,
  IDelegationNode,
  IDidResolver,
  IRequestForAttestation,
  SignCallback,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import {
  DidDetails,
  DidResolver,
  isDidSignature,
  verifyDidSignature,
} from '@kiltprotocol/did'
import * as Claim from '../claim/index.js'
import { hashClaimContents } from '../claim/index.js'
import { verifyClaimAgainstSchema } from '../ctype/index.js'
import * as Credential from '../credential/index.js'

function getHashRoot(leaves: Uint8Array[]): Uint8Array {
  const result = Crypto.u8aConcat(...leaves)
  return Crypto.hash(result)
}

function getHashLeaves(
  claimHashes: Hash[],
  legitimations: ICredential[],
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

export function calculateRootHash(
  request: Partial<IRequestForAttestation>
): Hash {
  const hashes: Uint8Array[] = getHashLeaves(
    request.claimHashes || [],
    request.legitimations || [],
    request.delegationId || null
  )
  const root: Uint8Array = getHashRoot(hashes)
  return Crypto.u8aToHex(root)
}

/**
 * Removes [[Claim]] properties from the [[RequestForAttestation]] object, provides anonymity and security when building the [[createPresentation]] method.
 *
 * @param req4Att - The RequestForAttestation object to remove properties from.
 * @param properties - Properties to remove from the [[Claim]] object.
 * @throws [[ERROR_CLAIM_HASHTREE_MISMATCH]] when a property which should be deleted wasn't found.
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
  req4Att.claimNonceMap = hashClaimContents(req4Att.claim, {
    nonces: req4Att.claimNonceMap,
  }).nonceMap
}

export function makeSigningData(
  input: IRequestForAttestation,
  challenge?: string
): Uint8Array {
  return new Uint8Array([
    ...Crypto.coToUInt8(input.rootHash),
    ...Crypto.coToUInt8(challenge),
  ])
}

/**
 * Add a claimer signature to a RequestForAttestation.
 *
 * @param req4Att - The RequestForAttestation object to add the signature to.
 * @param sig - The signature to be added.
 * @param keyUri - The DID key uri of the key, which was used to make the signature.
 * @param options - Optional parameters.
 * @param options.challenge - An optional challenge, which was included in the signing process.
 */
export async function addSignature(
  req4Att: IRequestForAttestation,
  sig: string | Uint8Array,
  keyUri: DidPublicKey['uri'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const signature = typeof sig === 'string' ? sig : Crypto.u8aToHex(sig)
  // eslint-disable-next-line no-param-reassign
  req4Att.claimerSignature = { signature, keyUri, challenge }
}

/**
 * Adds a claimer signature to a RequestForAttestation using a DID key.
 *
 * @param req4Att - The RequestForAttestation object to add the signature to.
 * @param sign - The signing callback.
 * @param didDetails - The DID details of the signer.
 * @param keyId - The DID key id to be used for the signing.
 * @param options - Optional parameters.
 * @param options.challenge - An optional challenge, which will be included in the signing process.
 */
export async function signWithDidKey(
  req4Att: IRequestForAttestation,
  sign: SignCallback,
  didDetails: DidDetails,
  keyId: DidVerificationKey['id'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const { signature, keyUri: signatureKeyId } = await didDetails.signPayload(
    makeSigningData(req4Att, challenge),
    sign,
    keyId
  )
  addSignature(req4Att, signature, signatureKeyId, { challenge })
}

export function verifyRootHash(input: IRequestForAttestation): boolean {
  return input.rootHash === calculateRootHash(input)
}

/**
 * Verifies the data of the [[RequestForAttestation]] object; used to check that the data was not tampered with, by checking the data against hashes.
 *
 * @param input - The [[RequestForAttestation]] for which to verify data.
 * @returns Whether the data is valid.
 * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] when any key of the claim contents could not be found in the claimHashTree.
 * @throws [[ERROR_ROOT_HASH_UNVERIFIABLE]] when the rootHash is not verifiable.
 */
export function verifyDataIntegrity(input: IRequestForAttestation): boolean {
  // check claim hash
  if (!verifyRootHash(input)) {
    throw new SDKErrors.ERROR_ROOT_HASH_UNVERIFIABLE()
  }

  // verify properties against selective disclosure proof
  const verificationResult = Claim.verifyDisclosedAttributes(input.claim, {
    nonces: input.claimNonceMap,
    hashes: input.claimHashes,
  })
  // TODO: how do we want to deal with multiple errors during claim verification?
  if (!verificationResult.verified)
    throw (
      verificationResult.errors[0] || new SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
    )

  // check legitimations
  Credential.validateLegitimations(input.legitimations)

  return true
}

/**
 * Checks whether the input meets all the required criteria of an IRequestForAttestation object.
 * Throws on invalid input.
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 * @throws [[ERROR_CLAIM_NOT_PROVIDED]], [[ERROR_LEGITIMATIONS_NOT_PROVIDED]], [[ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED]] or [[ERROR_DELEGATION_ID_TYPE]] when either the input's claim, legitimations, claimHashTree or DelegationId are not provided or of the wrong type, respectively.
 * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] when any of the input's claimHashTree's keys missing their hash.
 *
 */
export function verifyDataStructure(input: IRequestForAttestation): void {
  if (!input.claim) {
    throw new SDKErrors.ERROR_CLAIM_NOT_PROVIDED()
  } else {
    Claim.verifyDataStructure(input.claim)
  }
  if (!input.claim.owner) {
    throw new SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  }
  if (!input.legitimations && !Array.isArray(input.legitimations)) {
    throw new SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED()
  }

  if (!input.claimNonceMap) {
    throw new SDKErrors.ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED()
  }
  if (
    typeof input.claimNonceMap !== 'object' ||
    Object.entries(input.claimNonceMap).some(
      ([digest, nonce]) =>
        !digest ||
        !DataUtils.validateHash(digest, 'statement digest') ||
        typeof nonce !== 'string' ||
        !nonce
    )
  ) {
    throw new SDKErrors.ERROR_CLAIM_NONCE_MAP_MALFORMED()
  }
  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (input.claimerSignature) isDidSignature(input.claimerSignature)
}

/**
 * Checks the [[RequestForAttestation]] with a given [[CType]] to check if the included claim meets the [[schema]] structure.
 *
 * @param requestForAttestation A [[RequestForAttestation]] object for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[RequestForAttestation]] is valid.
 */
export function verifyAgainstCType(
  requestForAttestation: IRequestForAttestation,
  ctype: ICType
): boolean {
  try {
    verifyDataStructure(requestForAttestation)
  } catch {
    return false
  }
  return verifyClaimAgainstSchema(
    requestForAttestation.claim.contents,
    ctype.schema
  )
}

/**
 * Verifies the signature of the [[RequestForAttestation]] object.
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
  const { verified } = await verifyDidSignature({
    signature: claimerSignature,
    message: signingData,
    expectedVerificationMethod: KeyRelationship.authentication,
    resolver,
  })
  return verified
}

export type Options = {
  legitimations?: ICredential[]
  delegationId?: IDelegationNode['id']
}

/**
 * Builds a new [[RequestForAttestation]] object, from a complete set of required parameters.
 *
 * @param claim An `IClaim` object the request for attestation is built for.
 * @param option Container for different options that can be passed to this method.
 * @param option.legitimations Array of [[Credential]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new [[RequestForAttestation]] object.
 */
export function fromClaim(
  claim: IClaim,
  { legitimations, delegationId }: Options = {}
): IRequestForAttestation {
  const { hashes: claimHashes, nonceMap: claimNonceMap } =
    Claim.hashClaimContents(claim)

  const rootHash = calculateRootHash({
    legitimations,
    claimHashes,
    delegationId,
  })

  // signature will be added afterwards!
  const request = {
    claim,
    legitimations: legitimations || [],
    claimHashes,
    claimNonceMap,
    rootHash,
    delegationId: delegationId || null,
  }
  verifyDataStructure(request)
  return request
}

type VerifyOptions = {
  ctype?: ICType
  challenge?: string
  resolver?: IDidResolver
}

/**
 * Verifies data structure and integrity.
 *
 * @param requestForAttestation - The object to check.
 * @param options - Additional parameter for more verification step.
 * @param options.ctype - Ctype which the included claim should be checked against.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 * @throws - If a check fails.
 */
export async function verify(
  requestForAttestation: IRequestForAttestation,
  { ctype, challenge, resolver = DidResolver }: VerifyOptions = {}
): Promise<void> {
  verifyDataStructure(requestForAttestation)
  verifyDataIntegrity(requestForAttestation)

  if (ctype) {
    const isSchemaValid = verifyAgainstCType(requestForAttestation, ctype)
    if (!isSchemaValid) throw new SDKErrors.ERROR_CREDENTIAL_UNVERIFIABLE()
  }

  if (challenge) {
    const isSignatureCorrect = verifySignature(requestForAttestation, {
      challenge,
      resolver,
    })
    if (!isSignatureCorrect) throw new SDKErrors.ERROR_SIGNATURE_UNVERIFIABLE()
  }
}

/**
 * Custom Type Guard to determine input being of type IRequestForAttestation..
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 *
 * @returns  Boolean whether input is of type IRequestForAttestation.
 */
export function isIRequestForAttestation(
  input: unknown
): input is IRequestForAttestation {
  try {
    verifyDataStructure(input as IRequestForAttestation)
  } catch (error) {
    console.error(error)
    return false
  }
  return true
}

/**
 * Compresses [[Credential]]s which are made up from an [[Attestation]] and [[RequestForAttestation]] for storage and/or message.
 *
 * @param leg An array of [[Attestation]] and [[RequestForAttestation]] objects.
 *
 * @returns An ordered array of [[Credential]]s.
 */
function compressLegitimation(leg: ICredential[]): CompressedCredential[] {
  return leg.map(Credential.compress)
}

/**
 * Decompresses [[Credential]]s which are an [[Attestation]] and [[RequestForAttestation]] from storage and/or message.
 *
 * @param leg A compressed [[Attestation]] and [[RequestForAttestation]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[Credential]].
 */
function decompressLegitimation(leg: CompressedCredential[]): ICredential[] {
  return leg.map(Credential.decompress)
}

/**
 * Compresses a [[RequestForAttestation]] for storage and/or messaging.
 *
 * @param reqForAtt A [[RequestForAttestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[RequestForAttestation]].
 */
export function compress(
  reqForAtt: IRequestForAttestation
): CompressedRequestForAttestation {
  verifyDataStructure(reqForAtt)
  return [
    Claim.compress(reqForAtt.claim),
    reqForAtt.claimNonceMap,
    reqForAtt.claimerSignature,
    reqForAtt.claimHashes,
    reqForAtt.rootHash,
    compressLegitimation(reqForAtt.legitimations),
    reqForAtt.delegationId,
  ]
}

/**
 * Decompresses a [[RequestForAttestation]] from storage and/or message.
 *
 * @param reqForAtt A compressed [[RequestForAttestation]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when reqForAtt is not an Array and it's length is not equal to the defined length of 8.
 *
 * @returns An object that has the same properties as a [[RequestForAttestation]].
 */
export function decompress(
  reqForAtt: CompressedRequestForAttestation
): IRequestForAttestation {
  if (!Array.isArray(reqForAtt) || reqForAtt.length !== 7) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Request for Attestation')
  }
  const decompressedRequestForAttestation = {
    claim: Claim.decompress(reqForAtt[0]),
    claimNonceMap: reqForAtt[1],
    claimerSignature: reqForAtt[2],
    claimHashes: reqForAtt[3],
    rootHash: reqForAtt[4],
    legitimations: decompressLegitimation(reqForAtt[5]),
    delegationId: reqForAtt[6],
  }
  verifyDataStructure(decompressedRequestForAttestation)
  return decompressedRequestForAttestation
}

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
  DidPublicKey,
  DidVerificationKey,
  Hash,
  IAttestation,
  IClaim,
  ICType,
  IDelegationNode,
  IDidResolver,
  ICredential,
  SignCallback,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import {
  DidDetails,
  DidResolver,
  isDidSignature,
  verifyDidSignature,
  Utils as DidUtils,
  DidKeySelectionCallback,
} from '@kiltprotocol/did'
import * as Claim from '../claim/index.js'
import { hashClaimContents } from '../claim/index.js'
import { verifyClaimAgainstSchema } from '../ctype/index.js'

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
      result.push(Crypto.coToUInt8(legitimation.rootHash))
    })
  }
  if (delegationId) {
    result.push(Crypto.coToUInt8(delegationId))
  }

  return result
}

export function calculateRootHash(request: Partial<ICredential>): Hash {
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
  req4Att: ICredential,
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

/**
 * Prepares credential data for signing.
 *
 * @param input - The Credential to prepare the data for.
 * @param challenge - An optional challenge to be included in the signing process.
 * @returns The prepared signing data.
 */
export function makeSigningData(
  input: ICredential,
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
  req4Att: ICredential,
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
  req4Att: ICredential,
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

/**
 * Verifies if the credential hash matches the contents of it.
 *
 * @param input - The credential to check.
 * @returns Wether they match or not.
 */
export function verifyRootHash(input: ICredential): boolean {
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
export function verifyDataIntegrity(input: ICredential): boolean {
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
  input.legitimations.forEach((legitimation: ICredential) => {
    if (!verifyDataIntegrity(legitimation)) {
      throw new SDKErrors.ERROR_LEGITIMATIONS_UNVERIFIABLE()
    }
  })

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
export function verifyDataStructure(input: ICredential): void {
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
  requestForAttestation: ICredential,
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
  input: ICredential,
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
): ICredential {
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
  checkSignatureWithoutChallenge?: boolean
}

/**
 * Verifies data structure, data integrity and claimers signature.
 *
 * Upon presentation of a credential, a verifier would call this [[verify]] function.
 *
 * @param requestForAttestation - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.checkSignatureWithoutChallenge - Wether to check the signature without a challenge being present.
 * @param options.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 * @throws - If a check fails.
 */
export async function verify(
  requestForAttestation: ICredential,
  {
    ctype,
    challenge,
    resolver = DidResolver,
    checkSignatureWithoutChallenge = true,
  }: VerifyOptions = {}
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
  } else if (checkSignatureWithoutChallenge) {
    const isSignatureCorrect = verifySignature(requestForAttestation, {
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
export function isIRequestForAttestation(input: unknown): input is ICredential {
  try {
    verifyDataStructure(input as ICredential)
  } catch (error) {
    console.error(error)
    return false
  }
  return true
}

/**
 * Gets the hash of the credential.
 *
 * @param credential - The credential to get the hash from.
 * @returns The hash of the credential.
 */
export function getHash(credential: ICredential): IAttestation['claimHash'] {
  return credential.rootHash
}

function getAttributes(credential: ICredential): Set<string> {
  // TODO: move this to claim or contents
  return new Set(Object.keys(credential.claim.contents))
}

/**
 * Creates a public presentation which can be sent to a verifier.
 * This presentation is signed.
 *
 * @param presentationOptions The additional options to use upon presentation generation.
 * @param presentationOptions.credential The credential to create the presentation for.
 * @param presentationOptions.sign The callback to sign the presentation.
 * @param presentationOptions.claimerDid The DID details of the presenter.
 * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
 * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
 * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
 * @param presentationOptions.keySelection The logic to select the right key to sign for the delegee. It defaults to picking the first key from the set of valid keys.
 * @returns A deep copy of the Credential with all but `publicAttributes` removed.
 */
export async function createPresentation({
  credential,
  selectedAttributes,
  sign,
  challenge,
  claimerDid,
  keySelection = DidUtils.defaultKeySelectionCallback,
}: {
  credential: ICredential
  selectedAttributes?: string[]
  sign: SignCallback
  challenge?: string
  claimerDid: DidDetails
  keySelection?: DidKeySelectionCallback<DidVerificationKey>
}): Promise<ICredential> {
  const presentation =
    // clone the attestation and request for attestation because properties will be deleted later.
    // TODO: find a nice way to clone stuff
    JSON.parse(JSON.stringify(credential))

  // filter attributes that are not in public attributes
  const excludedClaimProperties = selectedAttributes
    ? Array.from(getAttributes(credential)).filter(
        (property) => !selectedAttributes.includes(property)
      )
    : []

  // remove these attributes
  removeClaimProperties(presentation.request, excludedClaimProperties)

  const keys = claimerDid.getVerificationKeys(KeyRelationship.authentication)
  const selectedKeyId = (await keySelection(keys))?.id

  if (!selectedKeyId) {
    throw new SDKErrors.ERROR_UNSUPPORTED_KEY(KeyRelationship.authentication)
  }

  await signWithDidKey(presentation.request, sign, claimerDid, selectedKeyId, {
    challenge,
  })

  return presentation
}

/**
 * Compresses a [[RequestForAttestation]] for storage and/or messaging.
 *
 * @param reqForAtt A [[RequestForAttestation]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[RequestForAttestation]].
 */
export function compress(reqForAtt: ICredential): CompressedCredential {
  verifyDataStructure(reqForAtt)
  return [
    Claim.compress(reqForAtt.claim),
    reqForAtt.claimNonceMap,
    reqForAtt.claimerSignature,
    reqForAtt.claimHashes,
    reqForAtt.rootHash,
    reqForAtt.legitimations.map(compress),
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
export function decompress(reqForAtt: CompressedCredential): ICredential {
  if (!Array.isArray(reqForAtt) || reqForAtt.length !== 7) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Request for Attestation')
  }
  const decompressedRequestForAttestation = {
    claim: Claim.decompress(reqForAtt[0]),
    claimNonceMap: reqForAtt[1],
    claimerSignature: reqForAtt[2],
    claimHashes: reqForAtt[3],
    rootHash: reqForAtt[4],
    legitimations: reqForAtt[5].map(decompress),
    delegationId: reqForAtt[6],
  }
  verifyDataStructure(decompressedRequestForAttestation)
  return decompressedRequestForAttestation
}

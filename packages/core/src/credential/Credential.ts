/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Credentials are a core building block of the KILT SDK.
 * A Credential represents a [[Claim]] which needs to be validated. In practice, the Credential is sent from a claimer to an attester for attesting and to a verifier for verification.
 *
 * A Credential object contains the [[Claim]] and its hash, and legitimations/delegationId of the attester.
 * It's signed by the claimer, to make it tamper-proof (`claimerSignature` is a property of [[Claim]]).
 * A Credential also supports hiding of claim data during a credential presentation.
 *
 * @packageDocumentation
 */

import type {
  CompressedCredential,
  DidResourceUri,
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
  const result = claimHashes.map((item) => Crypto.coToUInt8(item))
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

/**
 * Calculates the root hash of the credential.
 *
 * @param credential The credential object.
 * @returns The hash.
 */
export function calculateRootHash(credential: Partial<ICredential>): Hash {
  const hashes = getHashLeaves(
    credential.claimHashes || [],
    credential.legitimations || [],
    credential.delegationId || null
  )
  const root = getHashRoot(hashes)
  return Crypto.u8aToHex(root)
}

/**
 * Removes [[Claim]] properties from the [[Credential]] object, provides anonymity and security when building the [[createPresentation]] method.
 *
 * @param credential - The Credential object to remove properties from.
 * @param properties - Properties to remove from the [[Claim]] object.
 */
export function removeClaimProperties(
  credential: ICredential,
  properties: string[]
): void {
  properties.forEach((key) => {
    // eslint-disable-next-line no-param-reassign
    delete credential.claim.contents[key]
  })
  // eslint-disable-next-line no-param-reassign
  credential.claimNonceMap = hashClaimContents(credential.claim, {
    nonces: credential.claimNonceMap,
  }).nonceMap
}

/**
 * Prepares credential data for signing.
 *
 * @param input - The Credential to prepare the data for.
 * @param challenge - An optional challenge to be included in the signing process.
 * @returns The prepared signing data as Uint8Array.
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
 * Add a claimer signature to a Credential.
 *
 * @param credential - The Credential to add the signature to.
 * @param sig - The signature to be added.
 * @param keyUri - The DID key uri of the key, which was used to make the signature.
 * @param options - Optional parameters.
 * @param options.challenge - An optional challenge, which was included in the signing process.
 */
export async function addSignature(
  credential: ICredential,
  sig: string | Uint8Array,
  keyUri: DidResourceUri,
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const signature = typeof sig === 'string' ? sig : Crypto.u8aToHex(sig)
  // eslint-disable-next-line no-param-reassign
  credential.claimerSignature = { signature, keyUri, challenge }
}

/**
 * Adds a claimer signature to a Credential using a DID key.
 *
 * @param credential - The Credential to add the signature to.
 * @param signCallback - The signing callback.
 * @param didDetails - The DID details of the signer.
 * @param keyId - The DID key id to be used for the signing.
 * @param options - Optional parameters.
 * @param options.challenge - An optional challenge, which will be included in the signing process.
 */
export async function sign(
  credential: ICredential,
  signCallback: SignCallback,
  didDetails: DidDetails,
  keyId: DidVerificationKey['id'],
  {
    challenge,
  }: {
    challenge?: string
  } = {}
): Promise<void> {
  const { signature, keyUri: signatureKeyId } = await didDetails.signPayload(
    makeSigningData(credential, challenge),
    signCallback,
    keyId
  )
  await addSignature(credential, signature, signatureKeyId, { challenge })
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
 * Verifies the data of the [[Credential]] object; used to check that the data was not tampered with, by checking the data against hashes.
 *
 * @param input - The [[Credential]] for which to verify data.
 * @returns Whether the data is valid.
 */
export function verifyDataIntegrity(input: ICredential): boolean {
  // check claim hash
  if (!verifyRootHash(input)) {
    throw new SDKErrors.RootHashUnverifiableError()
  }

  // verify properties against selective disclosure proof
  const verificationResult = Claim.verifyDisclosedAttributes(input.claim, {
    nonces: input.claimNonceMap,
    hashes: input.claimHashes,
  })
  // TODO: how do we want to deal with multiple errors during claim verification?
  if (!verificationResult.verified)
    throw verificationResult.errors[0] || new SDKErrors.ClaimUnverifiableError()

  // check legitimations
  input.legitimations.forEach((legitimation) => {
    if (!verifyDataIntegrity(legitimation)) {
      throw new SDKErrors.LegitimationsUnverifiableError()
    }
  })

  return true
}

/**
 * Checks whether the input meets all the required criteria of an [[ICredential]] object.
 * Throws on invalid input.
 *
 * @param input - A potentially only partial [[Credential]].
 *
 */
export function verifyDataStructure(input: ICredential): void {
  if (!input.claim) {
    throw new SDKErrors.ClaimMissingError()
  } else {
    Claim.verifyDataStructure(input.claim)
  }
  if (!input.claim.owner) {
    throw new SDKErrors.OwnerMissingError()
  }
  if (!input.legitimations && !Array.isArray(input.legitimations)) {
    throw new SDKErrors.LegitimationsMissingError()
  }

  if (!input.claimNonceMap) {
    throw new SDKErrors.ClaimNonceMapMissingError()
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
    throw new SDKErrors.ClaimNonceMapMalformedError()
  }

  if (!input.claimHashes) {
    throw new SDKErrors.DataStructureError('claim hashes not provided')
  }

  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.DelegationIdTypeError()
  }
  if (input.claimerSignature) isDidSignature(input.claimerSignature)
}

/**
 * Checks the [[Credential]] with a given [[CType]] to check if the included claim meets the [[schema]] structure.
 *
 * @param credential A [[Credential]] for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[Credential]] is valid.
 */
export function verifyAgainstCType(
  credential: ICredential,
  ctype: ICType
): boolean {
  try {
    verifyDataStructure(credential)
  } catch {
    return false
  }
  return verifyClaimAgainstSchema(credential.claim.contents, ctype.schema)
}

/**
 * Verifies the signature of the [[Credential]].
 * It supports migrated DIDs, meaning that if the original claim within the [[Credential]] included a light DID that was afterwards upgraded,
 * the signature over the presentation **must** be generated with the full DID in order for the verification to be successful.
 * On the other hand, a light DID that has been migrated and then deleted from the chain will not be allowed to generate valid presentations anymore.
 *
 * @param input - The [[Credential]].
 * @param verificationOpts Additional verification options.
 * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
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
    expectedVerificationMethod: 'authentication',
    resolver,
  })
  return verified
}

export type Options = {
  legitimations?: ICredential[]
  delegationId?: IDelegationNode['id']
}

/**
 * Builds a new [[ICredential]] object, from a complete set of required parameters.
 *
 * @param claim An [[IClaim]] object to build the credential for.
 * @param option Container for different options that can be passed to this method.
 * @param option.legitimations Array of [[Credential]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new [[ICredential]] object.
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
  const credential = {
    claim,
    legitimations: legitimations || [],
    claimHashes,
    claimNonceMap,
    rootHash,
    delegationId: delegationId || null,
  }
  verifyDataStructure(credential)
  return credential
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
 * @param credential - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.checkSignatureWithoutChallenge - Wether to check the signature without a challenge being present.
 * @param options.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 */
export async function verify(
  credential: ICredential,
  {
    ctype,
    challenge,
    resolver = DidResolver,
    checkSignatureWithoutChallenge = true,
  }: VerifyOptions = {}
): Promise<void> {
  verifyDataStructure(credential)
  verifyDataIntegrity(credential)

  if (ctype) {
    const isSchemaValid = verifyAgainstCType(credential, ctype)
    if (!isSchemaValid) throw new SDKErrors.CredentialUnverifiableError()
  }

  if (challenge) {
    const isSignatureCorrect = verifySignature(credential, {
      challenge,
      resolver,
    })
    if (!isSignatureCorrect) throw new SDKErrors.SignatureUnverifiableError()
  } else if (checkSignatureWithoutChallenge) {
    const isSignatureCorrect = verifySignature(credential, {
      resolver,
    })
    if (!isSignatureCorrect) throw new SDKErrors.SignatureUnverifiableError()
  }
}

/**
 * Custom Type Guard to determine input being of type [[ICredential]]..
 *
 * @param input - A potentially only partial [[ICredential]].
 *
 * @returns  Boolean whether input is of type ICredential.
 */
export function isICredential(input: unknown): input is ICredential {
  try {
    verifyDataStructure(input as ICredential)
  } catch (error) {
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

/**
 * Gets names of the credential’s attributes.
 *
 * @param credential The credential.
 * @returns The set of names.
 */
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
 * @param presentationOptions.signCallback The callback to sign the presentation.
 * @param presentationOptions.claimerDid The DID details of the presenter.
 * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
 * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
 * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
 * @param presentationOptions.keySelection The logic to select the right key to sign for the delegate. It defaults to picking the first key from the set of valid keys.
 * @returns A deep copy of the Credential with all but `publicAttributes` removed.
 */
export async function createPresentation({
  credential,
  selectedAttributes,
  signCallback,
  challenge,
  claimerDid,
  keySelection = DidUtils.defaultKeySelectionCallback,
}: {
  credential: ICredential
  selectedAttributes?: string[]
  signCallback: SignCallback
  challenge?: string
  claimerDid: DidDetails
  keySelection?: DidKeySelectionCallback<DidVerificationKey>
}): Promise<ICredential> {
  const presentation: ICredential =
    // clone the credential because properties will be deleted later.
    // TODO: find a nice way to clone stuff
    JSON.parse(JSON.stringify(credential))

  // filter attributes that are not in public attributes
  const excludedClaimProperties = selectedAttributes
    ? Array.from(getAttributes(credential)).filter(
        (property) => !selectedAttributes.includes(property)
      )
    : []

  // remove these attributes
  removeClaimProperties(presentation, excludedClaimProperties)

  const keys = claimerDid.getVerificationKeys('authentication')
  const selectedKeyId = (await keySelection(keys))?.id

  if (!selectedKeyId) {
    throw new SDKErrors.UnsupportedKeyError('authentication')
  }

  await sign(presentation, signCallback, claimerDid, selectedKeyId, {
    challenge,
  })

  return presentation
}

/**
 * Compresses a [[Credential]] for storage and/or messaging.
 *
 * @param credential A [[Credential]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[Credential]].
 */
export function compress(credential: ICredential): CompressedCredential {
  verifyDataStructure(credential)
  return [
    Claim.compress(credential.claim),
    credential.claimNonceMap,
    credential.claimerSignature,
    credential.claimHashes,
    credential.rootHash,
    credential.legitimations.map(compress),
    credential.delegationId,
  ]
}

/**
 * Decompresses a [[Credential]] from storage and/or message.
 *
 * @param reqForAtt A compressed [[Credential]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[Credential]].
 */
export function decompress(reqForAtt: CompressedCredential): ICredential {
  if (!Array.isArray(reqForAtt) || reqForAtt.length !== 7) {
    throw new SDKErrors.DecompressionArrayError('Credential')
  }
  const decompressedCredential = {
    claim: Claim.decompress(reqForAtt[0]),
    claimNonceMap: reqForAtt[1],
    claimerSignature: reqForAtt[2],
    claimHashes: reqForAtt[3],
    rootHash: reqForAtt[4],
    legitimations: reqForAtt[5].map(decompress),
    delegationId: reqForAtt[6],
  }
  verifyDataStructure(decompressedCredential)
  return decompressedCredential
}

/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Credentials are a core building block of the KILT SDK.
 * A {@link ICredential | Credential} represents a {@link IClaim | Claim} which needs to be validated. In practice, the Credential is sent from a claimer to an attester for attesting and to a verifier for verification.
 *
 * A Credential object contains the Claim and its hash, and legitimations/delegationId of the attester.
 * The credential is made tamper-proof by hashing the claim properties and generating a digest from that, which is used to reference the Credential.
 * It can be signed by the claimer, to authenticate the holder and to prevent replay attacks.
 * A Credential also supports hiding of claim data during a credential presentation.
 *
 * @packageDocumentation
 */

import { ConfigService } from '@kiltprotocol/config'
import { Attestation, CType } from '@kiltprotocol/credentials'
import {
  isDidSignature,
  resolve,
  dereference,
  signatureFromJson,
  verifyDidSignature,
} from '@kiltprotocol/did'
import type {
  DidUrl,
  Did,
  Hash,
  IAttestation,
  ICType,
  IClaim,
  ICredential,
  ICredentialPresentation,
  IDelegationNode,
  SignerInterface,
  DereferenceDidUrl,
  DidDocument,
} from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors, Signers } from '@kiltprotocol/utils'
import * as Claim from './Claim.js'
import { hashClaimContents } from './Claim.js'

function getHashRoot(leaves: Uint8Array[]): Uint8Array {
  const result = Crypto.u8aConcat(...leaves)
  return Crypto.hash(result)
}

function getHashLeaves(
  claimHashes: Hash[],
  legitimations?: ICredential[],
  delegationId?: IDelegationNode['id'] | null
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
 * Removes {@link IClaim | Claim} properties from the {@link ICredential | Credential}, provides anonymity and security when building the {@link createPresentation} method.
 *
 * @param credential - The Credential object to remove properties from.
 * @param properties - Properties to remove from the {@link IClaim} object.
 * @returns A cloned Credential with removed properties.
 */
export function removeClaimProperties(
  credential: ICredential,
  properties: string[]
): ICredential {
  const presentation: ICredential =
    // clone the credential because properties will be deleted later.
    // TODO: find a nice way to clone stuff
    JSON.parse(JSON.stringify(credential))

  properties.forEach((key) => {
    delete presentation.claim.contents[key]
  })
  presentation.claimNonceMap = hashClaimContents(presentation.claim, {
    nonces: presentation.claimNonceMap,
  }).nonceMap

  return presentation
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
 * Verifies if the credential hash matches the contents of it.
 *
 * @param input - The credential to check.
 */
export function verifyRootHash(input: ICredential): void {
  if (input.rootHash !== calculateRootHash(input)) {
    throw new SDKErrors.RootHashUnverifiableError()
  }
}

/**
 * Verifies the data of the {@link ICredential} object; used to check that the data was not tampered with,
 * by checking the data against hashes. Throws if invalid.
 *
 * @param input - The {@link ICredential} for which to verify data.
 */
export function verifyDataIntegrity(input: ICredential): void {
  // check claim hash
  verifyRootHash(input)

  // verify properties against selective disclosure proof
  Claim.verifyDisclosedAttributes(input.claim, {
    nonces: input.claimNonceMap,
    hashes: input.claimHashes,
  })

  // check legitimations
  input.legitimations.forEach(verifyDataIntegrity)
}

/**
 * Checks whether the input meets all the required criteria of an {@link ICredential} object.
 * Throws on invalid input.
 *
 * @param input - A potentially only partial {@link ICredential}.
 *
 */
export function verifyDataStructure(input: ICredential): void {
  if (!('claim' in input)) {
    throw new SDKErrors.ClaimMissingError()
  } else {
    Claim.verifyDataStructure(input.claim)
  }
  if (!input.claim.owner) {
    throw new SDKErrors.OwnerMissingError()
  }
  if (!Array.isArray(input.legitimations)) {
    throw new SDKErrors.LegitimationsMissingError()
  }

  if (!('claimNonceMap' in input)) {
    throw new SDKErrors.ClaimNonceMapMissingError()
  }
  if (typeof input.claimNonceMap !== 'object') {
    throw new SDKErrors.ClaimNonceMapMalformedError()
  }
  Object.entries(input.claimNonceMap).forEach(([digest, nonce]) => {
    DataUtils.verifyIsHex(digest, 256)
    if (!digest || typeof nonce !== 'string' || !nonce) {
      throw new SDKErrors.ClaimNonceMapMalformedError()
    }
  })

  if (!('claimHashes' in input)) {
    throw new SDKErrors.DataStructureError('claim hashes not provided')
  }

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new SDKErrors.DelegationIdTypeError()
  }
}

/**
 * Verifies the signature of the {@link ICredentialPresentation}.
 * It supports migrated DIDs, meaning that if the original claim within the {@link ICredential} included a light DID that was afterwards upgraded,
 * the signature over the presentation **must** be generated with the full DID in order for the verification to be successful.
 * On the other hand, a light DID that has been migrated and then deleted from the chain will not be allowed to generate valid presentations anymore.
 *
 * @param input - The {@link ICredentialPresentation}.
 * @param verificationOpts Additional verification options.
 * @param verificationOpts.dereferenceDidUrl - The function used to dereference the claimer's DID Document and verification method. Defaults to {@link dereferenceDidUrl}.
 * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
 */
export async function verifySignature(
  input: ICredentialPresentation,
  {
    challenge,
    dereferenceDidUrl = dereference as DereferenceDidUrl['dereference'],
  }: {
    challenge?: string
    dereferenceDidUrl?: DereferenceDidUrl['dereference']
  } = {}
): Promise<void> {
  const { claimerSignature } = input
  if (challenge && challenge !== claimerSignature.challenge) {
    throw new SDKErrors.SignatureUnverifiableError(
      'Challenge differs from expected'
    )
  }
  const signingData = makeSigningData(input, claimerSignature.challenge)
  await verifyDidSignature({
    ...signatureFromJson(claimerSignature),
    message: signingData,
    // check if credential owner matches signer
    expectedSigner: input.claim.owner,
    // allow full did to sign presentation if owned by corresponding light did
    allowUpgraded: true,
    expectedVerificationRelationship: 'authentication',
    signerUrl: claimerSignature.keyUri,
    dereferenceDidUrl,
  })
}

export type Options = {
  legitimations?: ICredential[]
  delegationId?: IDelegationNode['id'] | null
}

/**
 * Builds a new {@link ICredential} object, from a complete set of required parameters.
 *
 * @param claim An {@link IClaim} object to build the credential for.
 * @param option Container for different options that can be passed to this method.
 * @param option.legitimations Array of {@link ICredential} objects of the Attester which the Claimer requests to include into the attestation as legitimations.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new {@link ICredential} object.
 */
export function fromClaim(
  claim: IClaim,
  { legitimations = [], delegationId = null }: Options = {}
): ICredential {
  const { hashes: claimHashes, nonceMap: claimNonceMap } =
    Claim.hashClaimContents(claim)

  const rootHash = calculateRootHash({
    legitimations,
    claimHashes,
    delegationId,
  })

  const credential = {
    claim,
    legitimations,
    claimHashes,
    claimNonceMap,
    rootHash,
    delegationId,
  }
  verifyDataStructure(credential)
  return credential
}

type VerifyOptions = {
  ctype?: ICType
  challenge?: string
  dereferenceDidUrl?: DereferenceDidUrl['dereference']
}

/**
 * Verifies data structure & data integrity of a credential object.
 * This combines all offline sanity checks that can be performed on an ICredential object.
 * A credential is valid only if it is well formed AND there is an on-chain attestation record referencing its root hash.
 * To check the latter condition as well, you need to call {@link verifyCredential} or {@link verifyPresentation}.
 *
 * @param credential - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 */
export function verifyWellFormed(
  credential: ICredential,
  { ctype }: VerifyOptions = {}
): void {
  verifyDataStructure(credential)
  verifyDataIntegrity(credential)

  if (ctype) {
    CType.verifyClaimAgainstSchema(credential.claim.contents, ctype)
  }
}

/**
 * Verifies whether the data of the given credential matches that of the corresponding attestation. It is valid if:
 * * the {@link Credential} object has valid data (see {@link Credential.verifyDataIntegrity});
 * and
 * * the data (root hash, CType, and delegation) of the {@link ICredential} object and of the {@link Attestation} are equivalent.
 *
 * @param attestation - The attestation to verify against.
 * @param credential - The credential to verify.
 */
export function verifyAgainstAttestation(
  attestation: IAttestation,
  credential: ICredential
): void {
  const credentialMismatch =
    credential.claim.cTypeHash !== attestation.cTypeHash
  const ctypeMismatch = credential.rootHash !== attestation.claimHash
  const delegationMismatch =
    credential.delegationId !== attestation.delegationId
  if (credentialMismatch || ctypeMismatch || delegationMismatch) {
    throw new SDKErrors.CredentialUnverifiableError(
      `Some attributes of the on-chain attestation diverge from the credential: ${[
        'cTypeHash',
        'delegationId',
        'claimHash',
      ]
        .filter(
          (_, i) => [ctypeMismatch, delegationMismatch, credentialMismatch][i]
        )
        .join(', ')}`
    )
  }
  verifyDataIntegrity(credential)
}

/**
 * Queries the attestation record for a credential and matches their data. Fails if no attestation exists, if it is revoked, or if the attestation data does not match the credential.
 *
 * @param credential The {@link ICredential} whose attestation status should be checked.
 * @returns An object containing the `attester` DID and `revoked` status of the on-chain attestation.
 */
export async function verifyAttested(credential: ICredential): Promise<{
  attester: Did
  revoked: boolean
}> {
  const api = ConfigService.get('api')
  const { rootHash } = credential
  const maybeAttestation = await api.query.attestation.attestations(rootHash)
  if (maybeAttestation.isNone) {
    throw new SDKErrors.CredentialUnverifiableError('Attestation not found')
  }
  const attestation = Attestation.fromChain(
    maybeAttestation,
    credential.rootHash
  )
  verifyAgainstAttestation(attestation, credential)
  const { owner: attester, revoked } = attestation
  return { attester, revoked }
}

export interface VerifiedCredential extends ICredential {
  revoked: boolean
  attester: Did
}

/**
 * Updates the revocation status of a previously verified credential to allow checking if it is still valid.
 *
 * @param verifiedCredential The output of {@link verifyCredential} or {@link verifyPresentation}, which adds a `revoked` and `attester` property.
 * @returns A promise of resolving to the same object but with the `revoked` property updated.
 * The promise rejects if the attestation has been deleted or its data changed since verification.
 */
export async function refreshRevocationStatus(
  verifiedCredential: VerifiedCredential
): Promise<VerifiedCredential> {
  if (
    typeof verifiedCredential.attester !== 'string' ||
    typeof verifiedCredential.revoked !== 'boolean'
  ) {
    throw new TypeError(
      'This function expects a VerifiedCredential with properties `revoked` (boolean) and `attester` (string)'
    )
  }
  const { revoked, attester } = await verifyAttested(verifiedCredential)
  if (attester !== verifiedCredential.attester) {
    throw new SDKErrors.CredentialUnverifiableError(
      'Attester has changed since first verification'
    )
  }
  return { ...verifiedCredential, revoked }
}

/**
 * Performs all steps to verify a credential (unsigned), which includes verifying data structure, data integrity, and looking up its attestation on the KILT blockchain.
 * In most cases, credentials submitted by a third party would be expected to be signed (a 'presentation').
 * To verify the additional signature as well, use `verifyPresentation`.
 *
 * @param credential - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 * @returns A {@link VerifiedCredential} object, which is the orignal credential with two additional properties: a boolean `revoked` status flag and the `attester` DID.
 */
export async function verifyCredential(
  credential: ICredential,
  { ctype }: VerifyOptions = {}
): Promise<VerifiedCredential> {
  verifyWellFormed(credential, { ctype })
  const { revoked, attester } = await verifyAttested(credential)
  return {
    ...credential,
    revoked,
    attester,
  }
}

/**
 * Performs all steps to verify a credential presentation (signed).
 * In addition to verifying data structure, data integrity, and looking up the attestation record on the KILT blockchain,
 * this involves verifying the claimer's signature over the credential.
 *
 * This is the function verifiers would typically call upon receiving a credential presentation from a third party.
 * The attester's identity and the credential revocation status returned by this function would then be either displayed to an end user
 * or processed in application logic deciding whether to accept or reject a credential submission
 * (e.g., by matching the attester DID against an allow-list of trusted attesters).
 *
 * @param presentation - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.dereferenceDidUrl - The function used to dereference the claimer's DID and verification method. Defaults to {@link dereference}.
 * @returns A {@link VerifiedCredential} object, which is the orignal credential presentation with two additional properties:
 * a boolean `revoked` status flag and the `attester` DID.
 */
export async function verifyPresentation(
  presentation: ICredentialPresentation,
  {
    ctype,
    challenge,
    dereferenceDidUrl = dereference as DereferenceDidUrl['dereference'],
  }: VerifyOptions = {}
): Promise<VerifiedCredential> {
  await verifySignature(presentation, {
    challenge,
    dereferenceDidUrl,
  })
  return verifyCredential(presentation, { ctype })
}

/**
 * Type Guard to determine input being of type {@link ICredential}.
 *
 * @param input - A potentially only partial ICredential.
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
 * Type Guard to determine input being of type {@link ICredentialPresentation}.
 *
 * @param input - An {@link ICredential}, {@link ICredentialPresentation}, or other object.
 *
 * @returns  Boolean whether input is of type ICredentialPresentation.
 */
export function isPresentation(
  input: unknown
): input is ICredentialPresentation {
  return (
    isICredential(input) &&
    isDidSignature((input as ICredentialPresentation).claimerSignature)
  )
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

const { verifiableOnChain, byDid } = Signers.select

/**
 * Creates a public presentation which can be sent to a verifier.
 * This presentation is signed.
 *
 * @param presentationOptions The additional options to use upon presentation generation.
 * @param presentationOptions.credential The credential to create the presentation for.
 * @param presentationOptions.signers An array of signer interfaces, one of which will be selected to sign the presentation.
 * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
 * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
 * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
 * @param presentationOptions.didDocument The credential owner's DID document; if omitted, it will be resolved from the blockchain.
 * @returns A deep copy of the Credential with all but `publicAttributes` removed.
 */
export async function createPresentation({
  credential,
  signers,
  selectedAttributes,
  challenge,
  didDocument,
}: {
  credential: ICredential
  signers: readonly SignerInterface[]
  selectedAttributes?: readonly string[]
  challenge?: string
  didDocument?: DidDocument
}): Promise<ICredentialPresentation> {
  // filter attributes that are not in public attributes
  const excludedClaimProperties = selectedAttributes
    ? Array.from(getAttributes(credential)).filter(
        (property) => !selectedAttributes.includes(property)
      )
    : []

  // remove these attributes
  const presentation = removeClaimProperties(
    credential,
    excludedClaimProperties
  )

  const didDoc =
    didDocument ?? (await resolve(credential.claim.owner)).didDocument

  if (!didDoc) {
    throw new Error(
      `Unable to sign: Failed to resolve claimer DID ${credential.claim.owner}`
    )
  }
  const signer = Signers.selectSigner(
    signers,
    verifiableOnChain(),
    byDid(didDoc, { verificationRelationship: 'authentication' })
  )
  if (!signer) {
    throw new SDKErrors.NoSuitableSignerError(undefined, {
      signerRequirements: {
        did: didDoc.id,
        algorithm: Signers.DID_PALLET_SUPPORTED_ALGORITHMS,
        verificationRelationship: 'authentication',
      },
    })
  }

  const signature = await signer?.sign({
    data: makeSigningData(presentation, challenge),
  })

  return {
    ...presentation,
    claimerSignature: {
      signature: Crypto.u8aToHex(signature),
      keyUri: signer.id as DidUrl,
      ...(challenge && { challenge }),
    },
  }
}

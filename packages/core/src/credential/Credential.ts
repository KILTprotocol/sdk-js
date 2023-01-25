/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Credentials are a core building block of the KILT SDK.
 * A Credential represents a [[Claim]] which needs to be validated. In practice, the Credential is sent from a claimer to an attester for attesting and to a verifier for verification.
 *
 * A Credential object contains the [[Claim]] and its hash, and legitimations/delegationId of the attester.
 * The credential is made tamper-proof by hashing the claim properties and generating a digest from that, which is used to reference the Credential.
 * It can be signed by the claimer, to authenticate the holder and to prevent replay attacks.
 * A Credential also supports hiding of claim data during a credential presentation.
 *
 * @packageDocumentation
 */

import { ConfigService } from '@kiltprotocol/config'
import {
  isDidSignature,
  verifyDidSignature,
  resolveKey,
  signatureToJson,
  signatureFromJson,
} from '@kiltprotocol/did'
import type {
  DidResolveKey,
  DidUri,
  Hash,
  IAttestation,
  IClaim,
  ICredential,
  ICredentialPresentation,
  ICType,
  IDelegationNode,
  SignCallback,
} from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import * as Attestation from '../attestation/index.js'
import * as Claim from '../claim/index.js'
import { hashClaimContents } from '../claim/index.js'
import { verifyClaimAgainstSchema } from '../ctype/index.js'
import { DelegationNode } from '../delegation/DelegationNode.js'

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
 * Removes [[Claim]] properties from the [[Credential]] object, provides anonymity and security when building the [[createPresentation]] method.
 *
 * @param credential - The Credential object to remove properties from.
 * @param properties - Properties to remove from the [[Claim]] object.
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
 * Verifies the data of the [[Credential]] object; used to check that the data was not tampered with,
 * by checking the data against hashes. Throws if invalid.
 *
 * @param input - The [[Credential]] for which to verify data.
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
 * Checks whether the input meets all the required criteria of an [[ICredential]] object.
 * Throws on invalid input.
 *
 * @param input - A potentially only partial [[Credential]].
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
 * Checks the [[Credential]] with a given [[CType]] to check if the included claim meets the [[ICType.$schema]] structure.
 *
 * @param credential A [[Credential]] for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 */
export function verifyAgainstCType(
  credential: ICredential,
  ctype: ICType
): void {
  verifyDataStructure(credential)
  verifyClaimAgainstSchema(credential.claim.contents, ctype)
}

/**
 * Verifies the signature of the [[ICredentialPresentation]].
 * It supports migrated DIDs, meaning that if the original claim within the [[ICredential]] included a light DID that was afterwards upgraded,
 * the signature over the presentation **must** be generated with the full DID in order for the verification to be successful.
 * On the other hand, a light DID that has been migrated and then deleted from the chain will not be allowed to generate valid presentations anymore.
 *
 * @param input - The [[ICredentialPresentation]].
 * @param verificationOpts Additional verification options.
 * @param verificationOpts.didResolveKey - The function used to resolve the claimer's key. Defaults to [[resolveKey]].
 * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
 */
export async function verifySignature(
  input: ICredentialPresentation,
  {
    challenge,
    didResolveKey = resolveKey,
  }: {
    challenge?: string
    didResolveKey?: DidResolveKey
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
    expectedVerificationMethod: 'authentication',
    didResolveKey,
  })
}

export type Options = {
  legitimations?: ICredential[]
  delegationId?: IDelegationNode['id'] | null
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

export interface TrustPolicy {
  /**
   * If set to true, attestations issued directly by this identity are accepted.
   */
  isAttester?: boolean
  /**
   * If set to true, attestations linked to a delegation node which this identity has control over are accepted.
   */
  isDelegator?: boolean
}
export type TrustPolicies = Record<DidUri, TrustPolicy>

/**
 * Queries the attestation record for a credential and matches their data. Fails if no attestation exists, if it is revoked, or if the attester is unknown.
 *
 * @param credential The [[ICredential]] whose attestation status should be checked.
 * @param allowedAuthorities A map from DIDs to trust policies to be applied for that DID. If the credential's attestation cannot be linked to one of the identies in this set, verifiation will fail. If omitted, the issuer of the attestation will not be checked.
 * @param allowRevoked If true, a revoked attestation will not fail verification.
 * @returns Information on the attester and revocation status of the on-chain attestation, as well as info on which trust policy led to acceptance of the credential.
 */
export async function verifyAttested(
  credential: ICredential,
  allowedAuthorities?: TrustPolicies,
  allowRevoked = false
): Promise<{
  attester: DidUri
  revoked: boolean
  matchedTrustPolicy: Partial<Record<keyof TrustPolicy, DidUri>>
}> {
  const api = ConfigService.get('api')
  const { rootHash } = credential
  const maybeAttestation = await api.query.attestation.attestations(rootHash)
  if (maybeAttestation.isNone) {
    throw new SDKErrors.CredentialUnverifiableError('Attestation not found')
  }
  const {
    cTypeHash,
    delegationId,
    owner: attester,
    revoked,
  } = Attestation.fromChain(maybeAttestation, rootHash)
  if (
    credential.claim.cTypeHash !== cTypeHash ||
    credential.delegationId !== delegationId
  ) {
    throw new SDKErrors.CredentialUnverifiableError(
      'Attestation does not match credential'
    )
  }
  if (revoked && allowRevoked !== true) {
    throw new SDKErrors.RevokedTypeError('Attestation revoked')
  } else if (typeof allowedAuthorities === 'undefined') {
    return { attester, revoked, matchedTrustPolicy: {} }
  } else if (allowedAuthorities[attester]?.isAttester === true) {
    return { attester, revoked, matchedTrustPolicy: { isAttester: attester } }
  } else if (credential.delegationId) {
    const trustedDelegators: DidUri[] = []
    Object.entries(allowedAuthorities).forEach(([did, trust]) => {
      if (trust.isDelegator === true) {
        trustedDelegators.push(did as DidUri)
      }
    })
    if (trustedDelegators.length > 0) {
      const delegation = await DelegationNode.fetch(credential.delegationId)
      const { node } = await delegation.findAncestorOwnedBy(trustedDelegators)
      if (node) {
        return {
          attester,
          revoked,
          matchedTrustPolicy: { isDelegator: node.account },
        }
      }
    }
  }
  throw new SDKErrors.CredentialUnverifiableError(
    'This attestation does not match any given trust policy and thus is not trusted'
  )
}

type VerifyOptions = {
  ctype?: ICType
  challenge?: string
  didResolveKey?: DidResolveKey
  allowedAuthorities?: TrustPolicies
  allowRevoked?: boolean
}

/**
 * Verifies data structure & data integrity of a credential object and its on-chain attestation.
 *
 * @param credential - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 * @param options.allowedAuthorities A map from DIDs to trust policies to be applied for that DID. If the credential's attestation cannot be linked to one of the identies in this set, verifiation will fail. If omitted, the issuer of the attestation will not be checked.
 * @param options.allowRevoked If true, a revoked attestation will not fail verification.
 */
export async function verifyCredential(
  credential: ICredential,
  { ctype, allowedAuthorities, allowRevoked }: VerifyOptions = {}
): Promise<void> {
  verifyDataStructure(credential)
  verifyDataIntegrity(credential)

  if (ctype) {
    verifyAgainstCType(credential, ctype)
  }

  await verifyAttested(credential, allowedAuthorities, allowRevoked)
}

/**
 * Verifies data structure, data integrity and the claimer's signature of a credential presentation.
 *
 * Upon presentation of a credential, a verifier would call this function.
 *
 * @param presentation - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.didResolveKey - The function used to resolve the claimer's key. Defaults to [[resolveKey]].
 * @param options.ctype - CType which the included claim should be checked against.
 * @param options.allowedAuthorities A map from DIDs to trust policies to be applied for that DID. If the credential's attestation cannot be linked to one of the identies in this set, verifiation will fail. If omitted, the issuer of the attestation will not be checked.
 * @param options.allowRevoked If true, a revoked attestation will not fail verification.
 */
export async function verifyPresentation(
  presentation: ICredentialPresentation,
  { challenge, didResolveKey = resolveKey, ...passDownOpts }: VerifyOptions = {}
): Promise<void> {
  await verifyCredential(presentation, passDownOpts)
  await verifySignature(presentation, {
    challenge,
    didResolveKey,
  })
}

/**
 * Type Guard to determine input being of type [[ICredential]].
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
 * Type Guard to determine input being of type [[ICredentialPresentation]].
 *
 * @param input - An [[ICredential]], [[ICredentialPresentation]], or other object.
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

/**
 * Creates a public presentation which can be sent to a verifier.
 * This presentation is signed.
 *
 * @param presentationOptions The additional options to use upon presentation generation.
 * @param presentationOptions.credential The credential to create the presentation for.
 * @param presentationOptions.signCallback The callback to sign the presentation.
 * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
 * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
 * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
 * @returns A deep copy of the Credential with all but `publicAttributes` removed.
 */
export async function createPresentation({
  credential,
  signCallback,
  selectedAttributes,
  challenge,
}: {
  credential: ICredential
  signCallback: SignCallback
  selectedAttributes?: string[]
  challenge?: string
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

  const signature = await signCallback({
    data: makeSigningData(presentation, challenge),
    did: credential.claim.owner,
    keyRelationship: 'authentication',
  })

  return {
    ...presentation,
    claimerSignature: {
      ...signatureToJson(signature),
      ...(challenge && { challenge }),
    },
  }
}

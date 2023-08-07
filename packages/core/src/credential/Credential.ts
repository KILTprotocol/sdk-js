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

import type {
  DidResolveKey,
  DidUri,
  IAttestation,
  IClaim,
  ICType,
  IDelegationNode,
} from '@kiltprotocol/types'
import { u8aToHex } from '@polkadot/util'
import {
  applySelectiveDisclosure,
  validateStructure as validateProofStructure,
  verify as verifyProof,
} from './KiltAttestationProofV1.js'
import {
  fromInput,
  validateStructure as validateCredentialStructure,
  validateSubject,
} from './KiltCredentialV1.js'
import { KiltCredentialV1 } from './types.js'
import { check as checkStatus } from './KiltRevocationStatusV1.js'
import { credentialIdToRootHash } from './utils.js'

/**
 * Produces a copy of a credential where only selected claims are disclosed for the purpose of presentation.
 *
 * @param original - The original credential object to remove claims from.
 * @param disclosedClaims - Claims related to the credentialSubject to be disclosed.
 * All other claims will be hidden, with exception of the credentialSubject id,
 * which is always included.
 * @returns A copy of the credential where selective disclosure has been applied.
 */
export function removeClaimProperties(
  original: KiltCredentialV1,
  disclosedClaims: string[]
): KiltCredentialV1 {
  const { credential, proof } = applySelectiveDisclosure(
    original,
    original.proof,
    disclosedClaims
  )
  return { ...credential, proof }
}

/**
 * Checks whether the input conforms to the expected structure of a credential and throws on invalid input.
 * This does not verify the integrity or authorship of data in the credential!
 *
 * @param input - A credential with or without embedded proof.
 * @param opts
 */
export function verifyDataStructure(
  input: KiltCredentialV1 | Omit<KiltCredentialV1, 'proof'>,
  opts: Parameters<typeof validateSubject>[1] = {}
): void {
  validateCredentialStructure(input)
  if ('proof' in input) {
    validateProofStructure(input.proof)
  }
  validateSubject(input, opts)
}

export type Options = {
  legitimations?: KiltCredentialV1[]
  delegationId?: IDelegationNode['id'] | null
  subject: DidUri
  issuer: DidUri
  cType: ICType['$id']
  timestamp?: Date | number
}

/**
 * Builds a new credential from info on the credential subject and issuer.
 *
 * @param claims An [[IClaim]] object to build the credential for.
 * @param option Container for different options that can be passed to this method.
 * @param option.legitimations Array of [[Credential]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @param option.timestamp
 * @param option.subject
 * @param option.issuer
 * @param option.cType
 * @returns A new [[ICredential]] object.
 */
export function fromClaims(
  claims: IClaim['contents'],
  {
    legitimations = [],
    delegationId,
    timestamp,
    subject,
    issuer,
    cType,
  }: Options
): Partial<KiltCredentialV1> {
  return fromInput({
    claims,
    subject,
    issuer,
    legitimations,
    delegationId: delegationId ?? undefined,
    cType,
    timestamp:
      typeof timestamp !== 'undefined'
        ? new Date(timestamp).getTime()
        : undefined,
  })
}

export type VerifyOptions = {
  cTypes?: ICType[]
  challenge?: string
  didResolveKey?: DidResolveKey
}

export interface VerifiedCredential extends KiltCredentialV1 {
  revoked: boolean
  attester: DidUri
}

/**
 * Updates the revocation status of a previously verified credential to allow checking if it is still valid.
 *
 * @param verifiedCredential The output of [[verifyCredential]] which adds a `revoked` and `attester` property.
 * @returns A promise of resolving to the same object but with the `revoked` property updated.
 * A credential is also considered revoked if the attestation has been deleted or if its data has changed.
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
  try {
    await checkStatus(verifiedCredential)
    return { ...verifiedCredential, revoked: false }
  } catch {
    return { ...verifiedCredential, revoked: true }
  }
}

/**
 * Performs all steps to verify a credential, which includes verifying data structure, data integrity, and looking up its attestation on the KILT blockchain.
 * In most cases, credentials submitted by a third party would be expected to be signed (a 'presentation').
 * To verify the additional signature as well, use `verifyPresentation`.
 *
 * @param credential - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.cTypes - CType which the included claim should be checked against.
 * @returns A [[VerifiedCredential]] object, which is the orignal credential with two additional properties: a boolean `revoked` status flag and the `attester` DID.
 */
export async function verifyCredential(
  credential: KiltCredentialV1,
  { cTypes }: VerifyOptions = {}
): Promise<VerifiedCredential> {
  await verifyProof(credential, credential.proof, { cTypes })
  let revoked = false
  try {
    await checkStatus(credential)
  } catch {
    revoked = true
  }
  return {
    ...credential,
    revoked,
    attester: credential.issuer,
  }
}

/**
 * Type Guard to determine input being of type [[ICredential]].
 *
 * @param input - A potentially only partial [[ICredential]].
 *
 * @returns  Boolean whether input is of type ICredential.
 */
export function isCredential(input: unknown): input is KiltCredentialV1 {
  try {
    validateCredentialStructure(input as KiltCredentialV1)
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
export function getHash(
  credential: KiltCredentialV1
): IAttestation['claimHash'] {
  return u8aToHex(credentialIdToRootHash(credential.id))
}

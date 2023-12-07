/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AccountId } from '@polkadot/types/interfaces'
import type { PublicCredentialsCredentialsCredential } from '@kiltprotocol/augment-api'
import type {
  HexString,
  Did as KiltDid,
  IAssetClaim,
  ICType,
  IDelegationNode,
  IPublicCredential,
  IPublicCredentialInput,
  PartialAssetClaim,
} from '@kiltprotocol/types'

import { CType } from '@kiltprotocol/credentials'
import { blake2AsHex } from '@polkadot/util-crypto'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'

import * as AssetDid from '../dids/index.js'
import { toChain as publicCredentialToChain } from './PublicCredential.chain.js'

/**
 * Calculates the ID of a {@link IPublicCredentialInput}, to be used to retrieve the full credential content from the blockchain.
 *
 * The ID is formed by first concatenating the SCALE-encoded {@link IPublicCredentialInput} with the SCALE-encoded {@link KiltDid | DID} and then Blake2b hashing the result.
 *
 * @param credential The input credential object.
 * @param attester The DID of the credential attester.
 * @returns The credential ID.
 */
export function getIdForCredential(
  credential: IPublicCredentialInput,
  attester: KiltDid
): HexString {
  const api = ConfigService.get('api')

  const scaleEncodedCredential = api
    .createType<PublicCredentialsCredentialsCredential>(
      'PublicCredentialsCredentialsCredential',
      publicCredentialToChain(credential)
    )
    .toU8a()
  const scaleEncodedAttester = api
    .createType<AccountId>('AccountId', Did.toChain(attester))
    .toU8a()

  return blake2AsHex(
    Uint8Array.from([...scaleEncodedCredential, ...scaleEncodedAttester])
  )
}

function verifyClaimStructure(input: IAssetClaim | PartialAssetClaim): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.CTypeHashMissingError()
  }
  if (input.subject) {
    AssetDid.validateDid(input.subject)
  }
  if (input.contents) {
    Object.entries(input.contents).forEach(([key, value]) => {
      if (
        !key ||
        typeof key !== 'string' ||
        !['string', 'number', 'boolean', 'object'].includes(typeof value)
      ) {
        throw new SDKErrors.ClaimContentsMalformedError()
      }
    })
  }
  DataUtils.verifyIsHex(input.cTypeHash, 256)
}

/**
 * Used internally only when building the {@link IPublicCredentialInput}.
 *
 * @param input Data from which to build an asset credential.
 */
function verifyDataStructure(input: IPublicCredentialInput): void {
  if (typeof input.claims !== 'object' || input.claims === null) {
    throw new SDKErrors.ClaimMissingError()
  }
  if (typeof input.subject !== 'string') {
    throw new SDKErrors.SubjectMissingError()
  }

  verifyClaimStructure({
    cTypeHash: input.cTypeHash,
    contents: input.claims,
    subject: input.subject,
  })

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new SDKErrors.DelegationIdTypeError()
  }
}

/**
 * Checks the {@link IPublicCredential} with a given {@link ICType | CType} to check if the included claim meets the structure described by that CType.
 *
 * This function is meant to be used by consumers of this {@link IPublicCredential}, once they have retrieved the full credential content.
 *
 * @param credential A {@link IPublicCredential} for the attester.
 * @param cType A {@link ICType} to verify the {@link IPublicCredential.claims} structure.
 */
export function verifyAgainstCType(
  credential: IPublicCredential,
  cType: ICType
): void {
  CType.verifyClaimAgainstSchema(credential.claims, cType)
}

type VerifyOptions = {
  cType?: ICType
}

/**
 * Verifies if a received {@link IPublicCredential} is valid, meaning if its content has not been tampered with and optionally if its structure matches a given {@link ICType}.
 *
 * **Successful verification of a public credential still requires the consumer to check the `revoked` property and take the appropriate action**.
 *
 * We recommend consumer of credentials to fetch them themselves using the functions exposed in this SDK.
 * Nevertheless, for some use cases having a function that verifies the content of a credential directly could be handy.
 * This function does that: it takes a {@link IPublicCredential}, and re-computes its cryptographically-generated ID to verify the content authenticity.
 *
 * @param credential The full {@link IPublicCredential} object.
 * @param options - Additional parameter for more verification steps.
 * @param options.cType - CType which the included claim should be checked against.
 */
export async function verifyCredential(
  credential: IPublicCredential,
  { cType }: VerifyOptions = {}
): Promise<void> {
  const { id, attester, blockNumber, revoked, ...credentialInput } = credential

  const recomputedId = getIdForCredential(credentialInput, attester)
  if (recomputedId !== id) {
    throw new SDKErrors.PublicCredentialError(
      `
      ID in credential and re-computed ID differ: ${id} != ${recomputedId}.
      This means that the content of the provided credential does not match the original one.
      `
    )
  }
  const api = ConfigService.get('api')

  // Try to fetch a credential with the same ID.
  const encodedCredentialEntry = await api.call.publicCredentials.getById(
    recomputedId
  )
  // If the credential entry can be fetched, it means that the key content has not been tampered with.
  if (encodedCredentialEntry.isNone) {
    throw new SDKErrors.PublicCredentialError(
      'Provided credential does not exist.'
    )
  }
  // Verify remaining properties
  if (cType) {
    verifyAgainstCType(credential, cType)
  }

  const {
    blockNumber: retrievedBlockNumber,
    revoked: retrievedRevocationStatus,
  } = encodedCredentialEntry.unwrap()
  if (!blockNumber.eq(retrievedBlockNumber)) {
    throw new SDKErrors.PublicCredentialError(
      `Block number in the credential (${
        credential.blockNumber
      }) different than what is stored on the blockchain (${retrievedBlockNumber.toBn()}).`
    )
  }
  if (revoked !== retrievedRevocationStatus.toPrimitive()) {
    throw new SDKErrors.PublicCredentialError(
      `Revocation status in the credential (${
        credential.revoked
      }) different than what is stored on the blockchain (${retrievedRevocationStatus.toPrimitive()}).`
    )
  }
}

export type PublicCredentialCreationOptions = {
  delegationId?: IDelegationNode['id'] | null
}

/**
 * Builds a new {@link IPublicCredentialInput} object, from a complete set of required parameters.
 *
 * @param claim An {@link IAssetClaim} object to build the credential for.
 * @param option Container for different options that can be passed to this method.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new {@link IPublicCredentialInput} object ready to be submitted to the blockchain for issuance.
 */
export function fromClaim(
  claim: IAssetClaim,
  { delegationId = null }: PublicCredentialCreationOptions = {}
): IPublicCredentialInput {
  const credential: IPublicCredentialInput = {
    claims: claim.contents,
    cTypeHash: claim.cTypeHash,
    subject: claim.subject,
    delegationId,
  }
  verifyDataStructure(credential)
  return credential
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { AccountId } from '@polkadot/types/interfaces'
import type { PublicCredentialsCredentialsCredential } from '@kiltprotocol/augment-api'
import type {
  DidUri,
  IAssetClaim,
  ICType,
  IDelegationNode,
  INewPublicCredential,
} from '@kiltprotocol/types'

import { blake2AsHex } from '@polkadot/util-crypto'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import { SDKErrors } from '@kiltprotocol/utils'

import { verifyClaimAgainstSchema } from '../ctype/CType.js'
import { verifyDataStructure as verifyClaimDataStructure } from '../claim/Claim.js'
import { toChain as publicCredentialToChain } from './PublicCredential.chain.js'

/**
 * Calculates the ID of a new credential, to be used to retrieve the full content from the blockchain.
 *
 * @param credential The input credential object.
 * @param attester The DID of the credential attester.
 * @returns The credential ID.
 */
export function computeId(
  credential: INewPublicCredential,
  attester: DidUri
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

/**
 * Checks whether the input meets all the required criteria of an [[INewPublicCredential]] object.
 * Throws on invalid input.
 *
 * @param input - A potentially only partial [[INewPublicCredential]].
 *
 */
export function verifyDataStructure(input: INewPublicCredential): void {
  // Taken from `Credential.verifyDataStructure()`
  if (!('claims' in input)) {
    throw new SDKErrors.ClaimMissingError()
  } else {
    verifyClaimDataStructure({
      cTypeHash: input.cTypeHash,
      contents: input.claims,
      subject: input.subject,
    })
  }
  if (!input.subject) {
    throw new SDKErrors.SubjectMissingError()
  }

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new SDKErrors.DelegationIdTypeError()
  }
}

/**
 * Checks the [[INewPublicCredential]] with a given [[CType]] to check if the included claim meets the [[schema]] structure.
 *
 * @param credential A [[INewPublicCredential]] for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 */
export function verifyAgainstCType(
  credential: INewPublicCredential,
  ctype: ICType
): void {
  // Taken from `Credential.verifyAgainstCType()`
  verifyDataStructure(credential)
  verifyClaimAgainstSchema(credential.claims, ctype)
}

export type Options = {
  delegationId?: IDelegationNode['id'] | null
}

type VerifyOptions = {
  ctype?: ICType
}

/**
 * Verifies data structure & data integrity of a public credential object.
 *
 * @param credential - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 */
export function verifyCredential(
  credential: INewPublicCredential,
  { ctype }: VerifyOptions = {}
): void {
  // Taken from `Credential.verifyCredential()`
  verifyDataStructure(credential)
  if (ctype) {
    verifyAgainstCType(credential, ctype)
  }
}

/**
 * Builds a new [[INewPublicCredential]] object, from a complete set of required parameters.
 *
 * @param claim An [[IClaim]] object to build the credential for.
 * @param option Container for different options that can be passed to this method.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new [[INewPublicCredential]] object.
 */
export function fromClaim(
  claim: IAssetClaim,
  { delegationId = null }: Options = {}
): INewPublicCredential {
  // Taken from `Credential.fromClaim()`
  const credential: INewPublicCredential = {
    claims: claim.contents,
    cTypeHash: claim.cTypeHash,
    subject: claim.subject,
    delegationId,
  }
  verifyCredential(credential)
  return credential
}

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
  IPublicCredential,
  IPublicCredentialInput,
} from '@kiltprotocol/types'

import { blake2AsHex } from '@polkadot/util-crypto'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import { SDKErrors } from '@kiltprotocol/utils'

import { verifyClaimAgainstSchema } from '../ctype/CType.js'
import { verifyDataStructure as verifyClaimDataStructure } from '../claim/Claim.js'
import { toChain as publicCredentialToChain } from './PublicCredential.chain.js'

/**
 * Calculates the ID of a [[IPublicCredentialInput]], to be used to retrieve the full content from the blockchain.
 *
 * The ID is formed by first concatenating the SCALE-encoded [[IPublicCredentialInput]] with the SCALE-encoded [[DidUri]] and then Blake2b hashing the result.
 *
 * @param credential The input credential object.
 * @param attester The DID of the credential attester.
 * @returns The credential ID.
 */
export function computeId(
  credential: IPublicCredentialInput,
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

// Used internally only when building the [[IPublicCredentialInput]].
function verifyDataStructure(input: IPublicCredentialInput): void {
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
 * Checks the [[IPublicCredential]] with a given [[CType]] to check if the included claim meets the [[schema]] structure.
 *
 * This function is meant to be used by consumers of this [[IPublicCredential]], once they have retrieved the full credential content.
 *
 * @param credential A [[IPublicCredential]] for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 */
export function verifyAgainstCType(
  credential: IPublicCredential,
  ctype: ICType
): void {
  verifyClaimAgainstSchema(credential.claims, ctype)
}

export type Options = {
  delegationId?: IDelegationNode['id'] | null
}

/**
 * Builds a new [[IPublicCredentialInput]] object, from a complete set of required parameters.
 *
 * @param claim An [[IClaim]] object to build the credential for.
 * @param option Container for different options that can be passed to this method.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new [[IPublicCredentialInput]] object ready to be submitted to the blockchain for issuance.
 */
export function fromClaim(
  claim: IAssetClaim,
  { delegationId = null }: Options = {}
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

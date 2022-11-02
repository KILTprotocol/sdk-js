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
  IPublicCredential,
} from '@kiltprotocol/types'

import { blake2AsHex } from '@polkadot/util-crypto'
import { ConfigService } from '@kiltprotocol/config'
import { toChain as didUriToChain } from '@kiltprotocol/did'

import { SDKErrors } from '@kiltprotocol/utils'
import { Claim } from '@kiltprotocol/core'
import { toChain as publicCredentialToChain } from './PublicCredential.chain.js'
import { validateUri } from './AssetDid.js'
import { verifyClaimAgainstSchema } from '../ctype/CType.js'

/**
 * @param credential
 * @param attester
 */
export function getIdForCredentialAndAttester(
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
    .createType<AccountId>('AccountId', didUriToChain(attester))
    .toU8a()

  return blake2AsHex(
    Uint8Array.from([...scaleEncodedCredential, ...scaleEncodedAttester])
  )
}

// Taken from Credential.verifyDataStructure()
/**
 * @param input
 */
export function verifyDataStructure(input: INewPublicCredential): void {
  if (!('claims' in input)) {
    throw new SDKErrors.ClaimMissingError()
  } else {
    Claim.verifyDataStructure({
      cTypeHash: input.cTypeHash,
      contents: input.claims,
      // TODO: verify the AssetDID here
      owner: input.attester,
    })
  }
  if (!input.subject) {
    throw new SDKErrors.SubjectMissingError()
  } else {
    validateUri(input.subject)
  }

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new SDKErrors.DelegationIdTypeError()
  }
}

/**
 * @param credential
 * @param ctype
 */
export function verifyAgainstCType(
  credential: IPublicCredential,
  ctype: ICType
): void {
  verifyClaimAgainstSchema(credential.claims, ctype)
}

type VerifyOptions = {
  ctype?: ICType
}

/**
 * @param credential
 * @param root0
 * @param root0.ctype
 */
export function verifyCredential(
  credential: IPublicCredential,
  { ctype }: VerifyOptions = {}
): void {
  verifyDataStructure(credential)
  if (ctype) {
    verifyAgainstCType(credential, ctype)
  }
}

/**
 * @param input
 */
export function isIPublicCredential(
  input: unknown
): input is IPublicCredential {
  try {
    verifyDataStructure(input as IPublicCredential)
  } catch {
    return false
  }
  return true
}

export type Options = {
  delegationId?: IDelegationNode['id'] | null
}

/**
 * @param claim
 * @param root0
 * @param root0.delegationId
 */
export function fromClaim(
  claim: IAssetClaim,
  { delegationId = null }: Options = {}
): INewPublicCredential {
  const credential: INewPublicCredential = {
    claims: claim.contents,
    cTypeHash: claim.cTypeHash,
    subject: claim.subject,
    delegationId,
  }
  verifyDataStructure(credential)
  return credential
}

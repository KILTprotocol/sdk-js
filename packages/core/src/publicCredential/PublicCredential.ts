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

export function getIdForNewCredentialAndAttester(
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

// Taken from Credential.verifyDataStructure()
export function verifyDataStructure(input: INewPublicCredential): void {
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

export function verifyAgainstCType(
  credential: INewPublicCredential,
  ctype: ICType
): void {
  verifyDataStructure(credential)
  verifyClaimAgainstSchema(credential.claims, ctype)
}

export type Options = {
  delegationId?: IDelegationNode['id'] | null
}

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

type VerifyOptions = {
  ctype?: ICType
}

export function verifyCredential(
  credential: INewPublicCredential,
  { ctype }: VerifyOptions = {}
): void {
  verifyDataStructure(credential)
  if (ctype) {
    verifyAgainstCType(credential, ctype)
  }
}

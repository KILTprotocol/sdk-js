/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */

import type { HexString } from '@polkadot/util/types'
import type { DidSignature } from './DidDetails'
import type { ICredential, CompressedCredential } from './Credential'
import type { IClaim, CompressedClaim } from './Claim'
import type { IDelegationNode } from './Delegation'

export type Hash = HexString

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export interface IRequestForAttestation {
  claim: IClaim
  claimNonceMap: Record<Hash, string>
  claimHashes: Hash[]
  claimerSignature?: DidSignature & { challenge?: string }
  delegationId: IDelegationNode['id'] | null
  legitimations: ICredential[]
  rootHash: Hash
}

export type CompressedRequestForAttestation = [
  CompressedClaim,
  IRequestForAttestation['claimNonceMap'],
  IRequestForAttestation['claimerSignature'],
  IRequestForAttestation['claimHashes'],
  IRequestForAttestation['rootHash'],
  CompressedCredential[],
  IRequestForAttestation['delegationId']
]

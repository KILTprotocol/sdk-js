/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { DidSignature } from './DidDocument'
import type { IClaim, CompressedClaim } from './Claim'
import type { IDelegationNode } from './Delegation'

export type Hash = HexString

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export interface ICredential {
  claim: IClaim
  claimNonceMap: Record<Hash, string>
  claimHashes: Hash[]
  claimerSignature?: DidSignature & { challenge?: string }
  delegationId: IDelegationNode['id'] | null
  legitimations: ICredential[]
  rootHash: Hash
}

export type CompressedCredential = [
  CompressedClaim,
  ICredential['claimNonceMap'],
  ICredential['claimerSignature'],
  ICredential['claimHashes'],
  ICredential['rootHash'],
  CompressedCredential[],
  ICredential['delegationId']
]

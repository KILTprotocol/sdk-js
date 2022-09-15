/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { DidSignature } from './DidDocument'
import type { IClaim } from './Claim'
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
  delegationId: IDelegationNode['id'] | null
  legitimations: ICredential[]
  rootHash: Hash
}

export interface ICredentialPresentation extends ICredential {
  claimerSignature: DidSignature & { challenge?: string }
}

export interface KiltPublishedCredentialV1 {
  credential: ICredentialPresentation
  metadata?: {
    label?: string
    blockNumber?: number
    txHash: HexString
  }
}

export type KiltPublishedCredentialCollectionV1 = KiltPublishedCredentialV1[]

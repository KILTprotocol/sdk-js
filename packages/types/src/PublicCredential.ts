/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { BN } from '@polkadot/util'

import type { CTypeHash } from './CType'
import type { IDelegationNode } from './Delegation'
import type { IClaim, IClaimContents } from './Claim'
import type { DidUri } from './DidDocument'

export interface INewPublicCredential {
  cTypeHash: CTypeHash
  delegationId: IDelegationNode['id'] | null
  // TODO: Replace with Asset DID
  subject: string
  claims: IClaimContents
}

export interface IPublicCredential extends INewPublicCredential {
  id: HexString
  attester: DidUri
  blockNumber: BN
}

export type ChainNamespace = string
export type ChainReference = string
export type ChainId = `${ChainNamespace}:${ChainReference}`

export type AssetNamespace = string
export type AssetReference = string
export type AssetInstance = string
export type AssetId =
  | `${AssetNamespace}:${AssetReference}`
  | `${AssetNamespace}:${AssetReference}:${AssetInstance}`

export type AssetDidUri = `did:asset:${ChainId}.${AssetId}`

export type IAssetClaim = Omit<IClaim, 'owner'> & { subject: AssetDidUri }

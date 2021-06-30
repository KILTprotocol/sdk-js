/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IDelegation
 */
import type { ICType } from './CType'
import type { IPublicIdentity } from './PublicIdentity'

/* eslint-disable no-bitwise */
export enum Permission {
  ATTEST = 1 << 0, // 0001
  DELEGATE = 1 << 1, // 0010
}

export interface IDelegationBaseNode {
  id: string
  account: IPublicIdentity['address']
  revoked: boolean
}

export interface IDelegationRootNode extends IDelegationBaseNode {
  cTypeHash: ICType['hash']
}

export interface IDelegationNode extends IDelegationBaseNode {
  rootId: IDelegationBaseNode['id']
  parentId?: IDelegationBaseNode['id']
  permissions: Permission[]
}

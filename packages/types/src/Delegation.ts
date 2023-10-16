/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { CTypeHash } from './CType'
import type { DidUri } from './Did'

/* eslint-disable no-bitwise */
export const Permission = {
  ATTEST: 1 << 0, // 0001
  DELEGATE: 1 << 1, // 0010
} as const
export type PermissionType = typeof Permission[keyof typeof Permission]

export interface IDelegationNode {
  id: string
  hierarchyId: IDelegationNode['id']
  parentId?: IDelegationNode['id']
  childrenIds: Array<IDelegationNode['id']>
  account: DidUri
  permissions: PermissionType[]
  revoked: boolean
}

export interface IDelegationHierarchyDetails {
  id: IDelegationNode['id']
  cTypeHash: CTypeHash
}

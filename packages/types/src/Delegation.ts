/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType } from './CType'
import type { IDidDetails } from './DidDetails'

/* eslint-disable no-bitwise */
export enum Permission {
  ATTEST = 1 << 0, // 0001
  DELEGATE = 1 << 1, // 0010
}

export interface IDelegationNode {
  id: string
  hierarchyId: IDelegationNode['id']
  parentId?: IDelegationNode['id']
  childrenIds: Array<IDelegationNode['id']>
  account: IDidDetails['uri']
  permissions: Permission[]
  revoked: boolean
}

export interface IDelegationHierarchyDetails {
  id: IDelegationNode['id']
  cTypeHash: ICType['hash']
}

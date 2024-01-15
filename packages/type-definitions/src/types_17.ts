/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { types12 } from './types_12.js'

export const types17: RegistryTypes = {
  ...types12,
  // Delegation updated types
  DelegationNode: {
    hierarchyRootId: 'DelegationNodeIdOf',
    parent: 'Option<DelegationNodeIdOf>',
    children: 'BTreeSet<DelegationNodeIdOf>',
    details: 'DelegationDetails',
  },
  DelegationDetails: {
    owner: 'DelegatorIdOf',
    revoked: 'bool',
    permissions: 'Permissions',
  },
  DelegationHierarchyDetails: {
    ctypeHash: 'CtypeHashOf',
  },
  DelegationStorageVersion: {
    _enum: ['V1', 'V2'],
  },
}

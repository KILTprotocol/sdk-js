/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { mergeType } from './mergeType.js'
import { types21 } from './types_21.js'

export const types23: RegistryTypes = mergeType(
  // Use the old types as the base of the new types.
  types21,

  // We add these new type:
  {
    MinCollators: 'u32',
    MaxTopCandidates: 'u32',

    // Renamed collator to candidate since they are not always collators (most of them are candidates)
    Candidate: {
      id: 'AccountId',
      stake: 'Balance',
      delegators: 'Vec<Stake>',
      total: 'Balance',
      // renamed from state to status to be consistent
      status: 'CandidateStatus',
    },
    CandidateStatus: {
      _enum: {
        Active: 'Null',
        Leaving: 'SessionIndex',
      },
    },
    StakingStorageVersion: {
      _enum: ['V1_0_0', 'V2_0_0', 'V3_0_0', 'V4', 'V5'],
    },
  },

  // Remove old DID types:
  [
    'MaxCollatorCandidates',
    'MinSelectedCandidates',
    'Collator',
    'CollatorStatus',
  ]
)

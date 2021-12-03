/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import type { DidKey, VerificationKeyRelationship } from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { FullDidDetails } from './FullDidDetails'

interface MethodMapping<V extends string> {
  default: V
  [section: string]: V
}

type SectionMapping<V extends string> = Record<string, MethodMapping<V>>

// Must be in sync with what's implemented in impl did::DeriveDidCallAuthorizationVerificationKeyRelationship for Call
// in https://github.com/KILTprotocol/mashnet-node/blob/develop/runtimes/spiritnet/src/lib.rs
const mapping: SectionMapping<VerificationKeyRelationship | 'paymentAccount'> =
  {
    attestation: { default: KeyRelationship.assertionMethod },
    ctype: { default: KeyRelationship.assertionMethod },
    delegation: { default: KeyRelationship.capabilityDelegation },
    did: {
      create: 'paymentAccount',
      reclaimDeposit: 'paymentAccount',
      submitDidCall: 'paymentAccount',
      default: KeyRelationship.authentication,
    },
    // Batch calls are not included here
    default: { default: 'paymentAccount' },
  }

export function getKeysForExtrinsic(
  fullDidDetails: FullDidDetails,
  extrinsic: Extrinsic
): DidKey[] {
  const callMethod = extrinsic.method
  const { section, method } = callMethod
  const keyRelationship = mapping[section][method] || mapping.default.default
  return keyRelationship === 'paymentAccount'
    ? []
    : fullDidDetails.getKeys(keyRelationship)
}

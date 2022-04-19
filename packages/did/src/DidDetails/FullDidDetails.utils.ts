/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { BN } from '@polkadot/util'

import type { VerificationKeyRelationship } from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'

interface MethodMapping<V extends string> {
  default: V
  [section: string]: V
}

type SectionMapping<V extends string> = Record<string, MethodMapping<V>>

// Must be in sync with what's implemented in impl did::DeriveDidCallAuthorizationVerificationKeyRelationship for Call
// in https://github.com/KILTprotocol/mashnet-node/blob/develop/runtimes/spiritnet/src/lib.rs
// TODO: Should have an RPC or something similar to avoid inconsistencies in the future.
const methodMapping: SectionMapping<
  VerificationKeyRelationship | 'paymentAccount'
> = {
  attestation: { default: KeyRelationship.assertionMethod },
  ctype: { default: KeyRelationship.assertionMethod },
  delegation: { default: KeyRelationship.capabilityDelegation },
  did: {
    create: 'paymentAccount',
    reclaimDeposit: 'paymentAccount',
    submitDidCall: 'paymentAccount',
    default: KeyRelationship.authentication,
  },
  didLookup: { default: KeyRelationship.authentication },
  web3Names: { default: KeyRelationship.authentication },
  // Batch calls are not included here
  default: { default: 'paymentAccount' },
}

export function getKeyRelationshipForExtrinsic(
  extrinsic: Extrinsic
): VerificationKeyRelationship | 'paymentAccount' {
  const callMethod = extrinsic.method
  const { section, method } = callMethod
  const mappedSection = methodMapping[section]
  if (!mappedSection) {
    return methodMapping.default.default
  }
  return mappedSection[method] || mappedSection.default
}

// Max nonce value is (2^64) - 1
const maxNonceValue = new BN(new BN(2).pow(new BN(64))).subn(1)

export function increaseNonce(currentNonce: BN, increment = 1): BN {
  // Wrap around the max u64 value when reached.
  // FIXME: can we do better than this? Maybe we could expose an RPC function for this, to keep it consistent over time.
  return currentNonce === maxNonceValue
    ? new BN(increment)
    : currentNonce.addn(increment)
}

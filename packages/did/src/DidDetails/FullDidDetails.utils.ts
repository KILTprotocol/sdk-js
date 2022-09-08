/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import { BN } from '@polkadot/util'

import type { VerificationKeyRelationship } from '@kiltprotocol/types'
import { AnyTuple, CallBase } from '@polkadot/types-codec/types'

// Must be in sync with what's implemented in impl did::DeriveDidCallAuthorizationVerificationKeyRelationship for Call
// in https://github.com/KILTprotocol/mashnet-node/blob/develop/runtimes/spiritnet/src/lib.rs
// TODO: Should have an RPC or something similar to avoid inconsistencies in the future.
const methodMapping: Record<string, VerificationKeyRelationship | undefined> = {
  attestation: 'assertionMethod',
  ctype: 'assertionMethod',
  delegation: 'capabilityDelegation',
  did: 'authentication',
  'did.create': undefined,
  'did.reclaimDeposit': undefined,
  'did.submitDidCall': undefined,
  didLookup: 'authentication',
  web3Names: 'authentication',
}

export function getKeyRelationshipForExtrinsic<A extends AnyTuple = AnyTuple>(
  call: CallBase<A>
): VerificationKeyRelationship | undefined {
  const { section, method } = call

  // get the VerificationKeyRelationship of a batched call
  if (
    section === 'utility' &&
    (method === 'batch' || method === 'batchAll' || method === 'forceBatch') &&
    call.args[0].toRawType() === 'Vec<Call>'
  ) {
    // map all calls to their VerificationKeyRelationship and deduplicate the items
    const keys = new Set(
      (call.args[0] as any as Array<CallBase<A>>).map(
        (innerExtrinsic: CallBase<A>) => {
          return getKeyRelationshipForExtrinsic(innerExtrinsic)
        }
      )
    )

    // Multiple VerificationKeyRelationships are not allowed.
    if (keys.size !== 1) {
      return undefined
    }
    return [...keys][0]
  }

  const signature = `${section}.${method}`
  if (signature in methodMapping) {
    return methodMapping[signature]
  }

  return methodMapping[section]
}

// Max nonce value is (2^64) - 1
const maxNonceValue = new BN(2).pow(new BN(64)).subn(1)

export function increaseNonce(currentNonce: BN, increment = 1): BN {
  // Wrap around the max u64 value when reached.
  // FIXME: can we do better than this? Maybe we could expose an RPC function for this, to keep it consistent over time.
  return currentNonce.eq(maxNonceValue)
    ? new BN(increment)
    : currentNonce.addn(increment)
}

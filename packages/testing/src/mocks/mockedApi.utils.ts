/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Option, U8aFixed, U64, Vec, U8 } from '@polkadot/types'
import type { Codec } from '@polkadot/types/types'
import type { Constructor } from '@polkadot/util/types'
import { createRegistryFromMetadata } from './typeRegistry.js'

const TYPE_REGISTRY = createRegistryFromMetadata()

TYPE_REGISTRY.setChainProperties(TYPE_REGISTRY.getChainProperties())

const AccountId = TYPE_REGISTRY.getOrThrow('AccountId')

type ChainQueryTypes = {
  attestation: 'attestations' | 'delegatedAttestations'
  ctype: 'cTYPEs'
  delegation: 'hierarchies' | 'delegations'
  did: 'dIDs'
  portablegabi: 'accumulatorList' | 'accumulatorCount' | 'accountState'
}

/**
 * Legend:
 * - ? === Option
 * - (...) === Tuple
 * - [...] === Vec.
 */
const chainQueryReturnTuples: {
  [K in keyof ChainQueryTypes]: {
    [T in ChainQueryTypes[K]]: Constructor
  }
} = {
  ctype: {
    // CTYPEs: ctype-hash -> account-id?
    cTYPEs: AccountId,
  },
  delegation: {
    // Delegation hierarchies: root-id -> (ctype-hash)?
    hierarchies: TYPE_REGISTRY.getOrUnknown(
      'DelegationDelegationHierarchyDelegationHierarchyDetails'
    ),
    // Delegations: delegation-id -> (hierarchy-id, parent-id?, childrenIds, details)?
    delegations: TYPE_REGISTRY.getOrUnknown(
      'DelegationDelegationHierarchyDelegationNode'
    ),
  },
  attestation: {
    // Attestations: claim-hash -> (ctype-hash, attester-account, delegation-id?, revoked, deposit)?
    attestations: TYPE_REGISTRY.getOrUnknown(
      'AttestationAttestationsAttestationDetails'
    ),
    // DelegatedAttestations: delegation-id -> [claim-hash]
    delegatedAttestations: TYPE_REGISTRY.getOrUnknown('Hash'),
  },
  did: {
    // DID: account-id -> (public-signing-key, public-encryption-key, did-reference?)?
    dIDs: TYPE_REGISTRY.getOrUnknown('DidDidDetails'),
  },
  portablegabi: {
    // AccumulatorList: account-id -> [accumulators]?
    accumulatorList: 'Vec<u8>' as unknown as Constructor,
    // AccumulatorCount: account-id -> counter
    accumulatorCount: U64,
    // AccountState: account-id -> state
    accountState: U64,
  },
}

/**
 * This function should be used to mock values of chain queries.
 * It sets the correct encoding types and mocks the chain query return value.
 *
 * @param outerQuery The name of the module which you want to query.
 * @param innerQuery The name of the storage item of the module which you want to query.
 * @param mockValue The value which the mock should return.
 * @returns The mockvalue wrapped into either a vector or an option.
 */
export function mockChainQueryReturn<T extends keyof ChainQueryTypes>(
  outerQuery: T,
  innerQuery: ChainQueryTypes[T],
  mockValue?:
    | Constructor
    | U64
    | string
    | Array<
        | Constructor
        | number
        | string
        | undefined
        | U8
        | boolean
        | null
        | U8aFixed
        | any
      >
): Option<Codec> | Vec<Codec> {
  const chainQueryReturnTuple =
    chainQueryReturnTuples[outerQuery as string][innerQuery]

  // helper function to wrap values into a vector
  function wrapInVec(): Vec<Codec> {
    return new Vec(
      TYPE_REGISTRY,
      chainQueryReturnTuple,
      mockValue as Constructor[]
    )
  }
  // helper function to wrap values into an option
  function wrapInOption(): Option<Codec> {
    return new Option(TYPE_REGISTRY, chainQueryReturnTuple, mockValue)
  }
  // check cases
  switch (outerQuery) {
    case 'attestation': {
      if (innerQuery === 'delegatedAttestations') {
        return wrapInVec()
      }
      return wrapInOption()
    }
    case 'ctype': {
      return wrapInOption()
    }
    case 'delegation': {
      return wrapInOption()
    }
    case 'did': {
      return wrapInOption()
    }
    case 'portablegabi': {
      if (innerQuery === 'accumulatorList') return wrapInOption()
      return chainQueryReturnTuple
    }
    default:
      // should never occur
      throw new Error(
        `Missing module ${outerQuery} for KILT chain. 
        The following ones exist: attestation, ctype, delegation, did, portablegabi.`
      )
  }
}

import {
  Bytes,
  Option,
  Tuple,
  TypeRegistry,
  U8aFixed,
  Vec,
} from '@polkadot/types'
import AccountId from '@polkadot/types/generic/AccountId'
import Bool from '@polkadot/types/primitive/Bool'
import U64 from '@polkadot/types/primitive/U64'
import U8 from '@polkadot/types/primitive/U8'
import { Codec } from '@polkadot/types/types'
import { Constructor } from '@polkadot/util/types'

const TYPE_REGISTRY = new TypeRegistry()
TYPE_REGISTRY.register({
  DelegationNodeId: 'Hash',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Permissions: 'u32',
  ErrorCode: 'u16',
  Signature: 'MultiSignature',
  Address: 'AccountId',
  LookupSource: 'AccountId',
  BlockNumber: 'u64',
  Index: 'u64',
  GenericAccountId: 'AccountId',
})
export default TYPE_REGISTRY

type ChainQueryTypes = {
  attestation: 'attestations' | 'delegatedAttestations'
  ctype: 'cTYPEs'
  delegation: 'root' | 'delegations' | 'children'
  did: 'dIDs'
  portablegabi: 'accumulatorList' | 'accumulatorCount' | 'accountState'
}

/**
 * Legend:
 * - ? === Option
 * - (...) === Tuple
 * - [...] === Vec
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
    // Root-Delegation: root-id -> (ctype-hash, account, revoked)
    root: Tuple.with(['Hash', AccountId, Bool]),
    // Delegations: delegation-id -> (root-id, parent-id?, account, permissions, revoked)?
    delegations: Tuple.with([
      TYPE_REGISTRY.getOrUnknown('DelegationNodeId'),
      Option.with(TYPE_REGISTRY.getOrUnknown('DelegationNodeId')),
      AccountId,
      TYPE_REGISTRY.getOrUnknown('Permissions'),
      Bool,
    ]),
    // Children: root-or-delegation-id -> [delegation-id]
    children: TYPE_REGISTRY.getOrUnknown('DelegationNodeId'),
  },
  attestation: {
    // Attestations: claim-hash -> (ctype-hash, attester-account, delegation-id?, revoked)?
    attestations: Tuple.with([
      'Hash',
      AccountId,
      Option.with(TYPE_REGISTRY.getOrUnknown('DelegationNodeId')),
      Bool,
    ]),
    // DelegatedAttestations: delegation-id -> [claim-hash]
    delegatedAttestations: TYPE_REGISTRY.getOrUnknown('Hash'),
  },
  did: {
    // DID: account-id -> (public-signing-key, public-encryption-key, did-reference?)?
    dIDs: Tuple.with(['Hash', 'Hash', Option.with(Bytes)]),
  },
  portablegabi: {
    // AccumulatorList: account-id -> [accumulators]?
    accumulatorList: ('Vec<u8>' as unknown) as Constructor,
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
  function wrapInVec() {
    return new Vec(
      TYPE_REGISTRY,
      chainQueryReturnTuple,
      mockValue as Constructor[]
    )
  }
  // helper function to wrap values into an option
  function wrapInOption() {
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
      if (innerQuery === 'children') return wrapInVec()
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

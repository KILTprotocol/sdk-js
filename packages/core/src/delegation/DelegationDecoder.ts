/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * When a [[DelegationNode]] or a [[DelegationHierarchy]] is written on the blockchain, it is encoded.
 * DelegationDecoder helps to decode them when they're queried from the chain.
 *
 * The DelegationDecoder methods transform a Codec type into an object of a KILT type.
 *
 * @packageDocumentation
 * @module DelegationDecoder
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import type {
  IDelegationNode,
  IDelegationHierarchyDetails,
} from '@kiltprotocol/types'
import { Permission } from '@kiltprotocol/types'
import type { Option } from '@polkadot/types'
import type { BTreeSet, Struct } from '@polkadot/types/codec'
import type { AccountId, Hash } from '@polkadot/types/interfaces/runtime'
import type { Bool, u32 } from '@polkadot/types/primitive'
import { DecoderUtils } from '@kiltprotocol/utils'
import { DidUtils } from '@kiltprotocol/did'
import { Deposit } from '../common'

export type CodecWithId<C> = {
  id: string
  codec: C
}

export type DelegationHierarchyDetailsRecord = Pick<
  IDelegationHierarchyDetails,
  'cTypeHash'
>

export type CtypeHash = Hash

export interface IChainDelegationHierarchyDetails extends Struct {
  readonly ctypeHash: CtypeHash
}

export function decodeDelegationHierarchyDetails(
  encoded: Option<IChainDelegationHierarchyDetails>
): DelegationHierarchyDetailsRecord | null {
  DecoderUtils.assertCodecIsType(encoded, [
    'Option<DelegationHierarchyDetails>',
  ])
  if (encoded.isNone) {
    return null
  }
  const delegationHierarchyDetails = encoded.unwrap()
  return {
    cTypeHash: delegationHierarchyDetails.ctypeHash.toHex(),
  }
}

/**
 * Decode the permissions from the bitset encoded in the given `number`.
 * We use bitwise `AND` to check if a permission bit flag is set.
 *
 * @param bitset The u32 number used as the bitset to encode permissions.
 * @returns The permission set.
 */
function decodePermissions(bitset: number): Permission[] {
  const permissions: Permission[] = []
  // eslint-disable-next-line no-bitwise
  if (bitset & Permission.ATTEST) {
    permissions.push(Permission.ATTEST)
  }
  // eslint-disable-next-line no-bitwise
  if (bitset & Permission.DELEGATE) {
    permissions.push(Permission.DELEGATE)
  }
  return permissions
}

export type DelegationNodeRecord = Omit<IDelegationNode, 'id'>

export type DelegationNodeId = Hash

export interface IChainDelegationNode extends Struct {
  readonly hierarchyRootId: DelegationNodeId
  readonly parent: Option<DelegationNodeId>
  readonly children: BTreeSet<DelegationNodeId>
  readonly details: IChainDelegationDetails
  readonly deposit: Deposit
}

type DelegationOwnerIdentifier = AccountId

export interface IChainDelegationDetails extends Struct {
  readonly owner: DelegationOwnerIdentifier
  readonly revoked: Bool
  readonly permissions: u32
}

export function decodeDelegationNode(
  encoded: Option<IChainDelegationNode>
): DelegationNodeRecord | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<DelegationNode>'])
  if (encoded.isNone) {
    return null
  }
  const delegationNode = encoded.unwrap()

  return {
    hierarchyId: delegationNode.hierarchyRootId.toHex(),
    parentId: delegationNode.parent.isSome
      ? delegationNode.parent.toHex()
      : undefined,
    childrenIds: [...delegationNode.children.keys()].map((id) => id.toHex()),
    account: DidUtils.getKiltDidFromIdentifier(
      delegationNode.details.owner.toString(),
      'full'
    ),
    permissions: decodePermissions(
      delegationNode.details.permissions.toNumber()
    ),
    revoked: delegationNode.details.revoked.valueOf(),
  }
}

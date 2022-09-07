/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * When a [[DelegationNode]] or a [[DelegationHierarchy]] is written on the blockchain, it is encoded.
 * DelegationDecoder helps to decode them when they're queried from the chain.
 *
 * The DelegationDecoder methods transform a Codec type into an object of a KILT type.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import type {
  IDelegationNode,
  IDelegationHierarchyDetails,
  KiltAddress,
} from '@kiltprotocol/types'
import { Permission, PermissionType } from '@kiltprotocol/types'
import type { Option } from '@polkadot/types'
import type { Hash } from '@polkadot/types/interfaces/runtime'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type {
  DelegationDelegationHierarchyDelegationHierarchyDetails,
  DelegationDelegationHierarchyDelegationNode,
} from '@kiltprotocol/augment-api'

export type CodecWithId<C> = {
  id: string
  codec: C
}

export type DelegationHierarchyDetailsRecord = Pick<
  IDelegationHierarchyDetails,
  'cTypeHash'
>

export type CtypeHash = Hash

export function decodeDelegationHierarchyDetails(
  encoded: Option<DelegationDelegationHierarchyDelegationHierarchyDetails>
): DelegationHierarchyDetailsRecord | null {
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
function decodePermissions(bitset: number): PermissionType[] {
  const permissions: PermissionType[] = []
  // eslint-disable-next-line no-bitwise
  if ((bitset & Permission.ATTEST) > 0) {
    permissions.push(Permission.ATTEST)
  }
  // eslint-disable-next-line no-bitwise
  if ((bitset & Permission.DELEGATE) > 0) {
    permissions.push(Permission.DELEGATE)
  }
  return permissions
}

export type DelegationNodeRecord = Omit<IDelegationNode, 'id'>

export type DelegationNodeId = Hash

export function decodeDelegationNode(
  encoded: Option<DelegationDelegationHierarchyDelegationNode>
): DelegationNodeRecord | null {
  if (encoded.isNone) {
    return null
  }
  const delegationNode = encoded.unwrap()

  return {
    hierarchyId: delegationNode.hierarchyRootId.toHex(),
    parentId: delegationNode.parent.isSome
      ? delegationNode.parent.toHex()
      : undefined,
    childrenIds: [...delegationNode.children].map((id) => id.toHex()),
    account: DidUtils.getFullDidUri(
      delegationNode.details.owner.toString() as KiltAddress
    ),
    permissions: decodePermissions(
      delegationNode.details.permissions.bits.toNumber()
    ),
    revoked: delegationNode.details.revoked.valueOf(),
  }
}

/**
 * Functions to decode types queried from the chain.
 *
 * When a type is queried from the chain using the `api.query...` functions, a result of type `Codec` is returned
 * by the polkadot-js api. We need to decode the encoded data to build the Kilt types from it.
 */

import { QueryResult } from '../blockchain/Blockchain'
import { coToUInt8 } from '../crypto/Crypto'
import { IDelegationNode } from './Delegation'
import { DelegationNode } from './DelegationNode'
import { DelegationRootNode } from './DelegationRootNode'
import { IDelegationRootNode, Permission } from '../primitives/Delegation'

export type CodecWithId = {
  id: string
  codec: QueryResult
}

export function decodeRootDelegation(
  encoded: QueryResult
): Partial<IDelegationRootNode | undefined> {
  const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
  let delegationRootNode: IDelegationRootNode | undefined
  if (json instanceof Array) {
    delegationRootNode = Object.assign(
      Object.create(DelegationRootNode.prototype),
      {
        cTypeHash: json[0],
        account: json[1],
        revoked: json[2],
      } as IDelegationRootNode
    )
  }
  return delegationRootNode
}

export function decodeDelegationNode(
  encoded: QueryResult
): IDelegationNode | undefined {
  const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
  let decodedNode: IDelegationNode | undefined
  if (json instanceof Array) {
    if (!verifyRoot(json[0])) {
      // Query returns 0x0 for rootId if queried for a root id instead of a node id.
      // A node without a root node is therefore interpreted as invalid.
      return undefined
    }
    decodedNode = Object.assign(Object.create(DelegationNode.prototype), {
      rootId: json[0],
      parentId: json[1], // optional
      account: json[2],
      permissions: decodePermissions(json[3]),
      revoked: json[4],
    } as IDelegationNode)
  }
  return decodedNode
}

/**
 * Checks if `rootId` is set (to something different than `0`)
 * @param rootId the root id part of the query result for delegation nodes
 */
function verifyRoot(rootId: string) {
  const rootU8: Uint8Array = coToUInt8(rootId)
  return (
    rootU8.reduce((accumulator, currentValue) => accumulator + currentValue) > 0
  )
}

/**
 * Decode the permissions from the bitset encoded in the given `number`.
 * We use bitwise `AND` to check if a permission bit flag is set.
 *
 * @param bitset the u32 number used as the bitset to encode permissions
 */
function decodePermissions(bitset: number): Permission[] {
  const permissions: Permission[] = []
  if (bitset & Permission.ATTEST) {
    permissions.push(Permission.ATTEST)
  }
  if (bitset & Permission.DELEGATE) {
    permissions.push(Permission.DELEGATE)
  }
  return permissions
}

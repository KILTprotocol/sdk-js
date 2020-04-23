/**
 * When [[DelegationNode]]s or [[DelegationRootNode]]s are written on the blockchain, they're encoded.
 * DelegationDecoder helps to decode them when they're queried from the chain.
 *
 * The DelegationDecoder methods transform a [[QueryResult]] into an object of a KILT type.
 *
 * @packageDocumentation
 * @ignore
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { Option, Tuple } from '@polkadot/types'
import { coToUInt8 } from '../crypto/Crypto'
import DelegationNode from './DelegationNode'
import DelegationRootNode from './DelegationRootNode'
import { Permission } from '../types/Delegation'

export type CodecWithId = {
  id: string
  codec: Option<Tuple>
}

export function decodeRootDelegation(
  encoded: Option<Tuple>
): DelegationRootNode | null {
  if (!encoded.isSome) {
    return null
  }
  const json = encoded.unwrap().toJSON()
  return Object.assign(Object.create(DelegationRootNode.prototype), {
    cTypeHash: json[0],
    account: json[1],
    revoked: json[2],
  })
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

/**
 * Checks if `rootId` is set (to something different than `0`).
 *
 * @param rootId The root id part of the query result for delegation nodes.
 * @returns Whether the root is set.
 */
function verifyRoot(rootId: string): boolean {
  const rootU8: Uint8Array = coToUInt8(rootId)
  return (
    rootU8.reduce((accumulator, currentValue) => accumulator + currentValue) > 0
  )
}

export function decodeDelegationNode(
  encoded: Option<Tuple>
): DelegationNode | null {
  if (!encoded.isSome) {
    return null
  }
  const json = encoded.unwrap().toJSON()
  if (typeof json[0] !== 'string' || typeof json[3] !== 'number') return null
  if (!verifyRoot(json[0])) {
    // Query returns 0x0 for rootId if queried for a root id instead of a node id.
    // A node without a root node is therefore interpreted as invalid.
    return null
  }
  return Object.assign(Object.create(DelegationNode.prototype), {
    rootId: json[0],
    parentId: json[1], // optional
    account: json[2],
    permissions: decodePermissions(json[3]),
    revoked: json[4],
  })
}

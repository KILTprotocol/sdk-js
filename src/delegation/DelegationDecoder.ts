/**
 * When [[DelegationNode]]s or [[DelegationRootNode]]s are written on the blockchain, they're encoded.
 * DelegationDecoder helps to decode them when they're queried from the chain.
 *
 * The DelegationDecoder methods transform a Codec type into an object of a KILT type.
 *
 * @packageDocumentation
 * @ignore
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { Option, Tuple } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { DelegationNode } from '..'
import { coToUInt8 } from '../crypto/Crypto'
import { IDelegationRootNode, Permission } from '../types/Delegation'
import { assertCodecIsType, hasNonNullByte } from '../util/Decode'

export type CodecWithId = {
  id: string
  codec: Option<Tuple>
}

export type RootDelegationRecord = Pick<
  IDelegationRootNode,
  'cTypeHash' | 'account' | 'revoked'
>

interface IChainRootDelegation extends Codec {
  toJSON: () => [string, string, boolean] | null
}

export function decodeRootDelegation(
  encoded: Option<Tuple>
): RootDelegationRecord | null {
  assertCodecIsType(encoded, ['Option<(H256,AccountId,bool)>'])
  if (encoded instanceof Option || hasNonNullByte(encoded)) {
    const json = (encoded as IChainRootDelegation).toJSON()
    if (json instanceof Array) {
      return {
        cTypeHash: json[0],
        account: json[1],
        revoked: json[2],
      }
    }
  }
  return null
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

export type DelegationNodeRecord = Pick<
  DelegationNode,
  'rootId' | 'parentId' | 'account' | 'permissions' | 'revoked'
>

interface IChainDelegationNode extends Codec {
  toJSON: () => [string, string | null, string, number, boolean] | null
}

export function decodeDelegationNode(
  encoded: Option<Tuple>
): DelegationNodeRecord | null {
  assertCodecIsType(encoded, [
    'Option<(DelegationNodeId,Option<DelegationNodeId>,AccountId,Permissions,bool)>',
  ])
  if (encoded instanceof Option || hasNonNullByte(encoded)) {
    const json = (encoded as IChainDelegationNode).toJSON()
    if (json instanceof Array) {
      if (typeof json[0] !== 'string' || typeof json[3] !== 'number')
        return null
      if (!verifyRoot(json[0])) {
        // Query returns 0x0 for rootId if queried for a root id instead of a node id.
        // A node without a root node is therefore interpreted as invalid.
        return null
      }
      return {
        rootId: json[0],
        parentId: json[1] || undefined, // optional
        account: json[2],
        permissions: decodePermissions(json[3]),
        revoked: json[4],
      }
    }
  }
  return null
}

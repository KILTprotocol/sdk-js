/**
 * When [[DelegationNode]]s or [[DelegationRootNode]]s are written on the blockchain, they're encoded.
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
import { Option } from '@polkadot/types'
import { IDelegationRootNode, Permission } from '@kiltprotocol/types'
import { Struct } from '@polkadot/types/codec'
import { AccountId, Hash } from '@polkadot/types/interfaces/runtime'
import { u32 } from '@polkadot/types/primitive'
import { DecoderUtils } from '@kiltprotocol/utils'
import { DelegationNode } from '..'

export type CodecWithId<C> = {
  id: string
  codec: C
}

export type RootDelegationRecord = Pick<
  IDelegationRootNode,
  'cTypeHash' | 'account' | 'revoked'
>

export interface IChainDelegationRoot extends Struct {
  readonly ctypeHash: Hash
  readonly owner: AccountId
  readonly revoked: boolean
}

export function decodeRootDelegation(
  encoded: Option<IChainDelegationRoot>
): RootDelegationRecord | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<DelegationRoot>'])
  if (encoded.isSome) {
    const delegationRoot = encoded.unwrap()
    // TODO: check that root is none
    return {
      cTypeHash: delegationRoot.ctypeHash.toString(),
      account: delegationRoot.owner.toString(),
      revoked: delegationRoot.revoked.valueOf(),
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

export type DelegationNodeRecord = Pick<
  DelegationNode,
  'rootId' | 'parentId' | 'account' | 'permissions' | 'revoked'
>

export type DelegationNodeId = Hash

export interface IChainDelegationNode extends Struct {
  readonly rootId: DelegationNodeId
  readonly parent: Option<DelegationNodeId>
  readonly owner: AccountId
  readonly permissions: u32
  readonly revoked: boolean
}

export function decodeDelegationNode(
  encoded: Option<IChainDelegationNode>
): DelegationNodeRecord | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<DelegationNode>'])
  if (encoded.isSome) {
    const delegationNode = encoded.unwrap()

    return {
      rootId: delegationNode.rootId.toString(),
      parentId: delegationNode.parent.isSome
        ? delegationNode.parent.toString()
        : undefined,
      account: delegationNode.owner.toString(),
      permissions: decodePermissions(delegationNode.permissions.toNumber()),
      revoked: delegationNode.revoked.valueOf(),
    }
  }
  return null
}

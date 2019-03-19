import { Codec } from '@polkadot/types/types'
import { IDelegationRootNode, IDelegationNode, Permission } from './Delegation'
import { factory } from '../config/ConfigLog'

const log = factory.getLogger('DelegationDecoder')

export function decodeRootDelegation(
  encoded: Codec | null | undefined
): Partial<IDelegationRootNode | undefined> {
  const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
  const delegationRootNode: IDelegationRootNode | undefined = json
    ? json.map((tuple: any[]) => {
        return {
          cTypeHash: tuple[0],
          account: tuple[1],
          revoked: tuple[2],
        } as IDelegationRootNode
      })[0]
    : undefined
  log.info(`Decoded delegation root: ${JSON.stringify(delegationRootNode)}`)
  return delegationRootNode
}

export function decodeDelegationNode(
  encoded: Codec | null | undefined
): IDelegationNode | undefined {
  log.debug(`decode(): encoded: ${encoded}`)
  const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
  let decodedNode: IDelegationNode | undefined
  if (json instanceof Array) {
    decodedNode = {
      rootId: json[0],
      parentId: json[1], // optional
      account: json[2],
      permissions: decodePermissions(json[3]),
      revoked: json[4],
    } as IDelegationNode
  }
  log.info(`Decoded delegation node: ${JSON.stringify(decodedNode)}`)
  return decodedNode
}

/**
 * Decode the permissions from the bitset encoded in the given `number`.
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

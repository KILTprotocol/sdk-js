import { Codec } from '@polkadot/types/types'
import { IDelegationRootNode, IDelegationNode, Permission } from './Delegation'
import { factory } from '../config/ConfigLog'

const log = factory.getLogger('Delegation')

export class DelegationDecoder {
  public static decodeRootDelegation(
    encoded: Codec | null | undefined
  ): Partial<IDelegationRootNode> {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    const delegationRootNode: IDelegationRootNode = json.map((tuple: any[]) => {
      return {
        cTypeHash: tuple[0],
        account: tuple[1],
        revoked: tuple[2],
      } as IDelegationRootNode
    })[0]
    log.info(`Decoded delegation root: ${JSON.stringify(delegationRootNode)}`)
    return delegationRootNode
  }

  public static decodeDelegationNode(
    encoded: Codec | null | undefined
  ): IDelegationNode {
    log.debug(`decode(): encoded: ${encoded}`)
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    let decodedNode: IDelegationNode = {} as IDelegationNode
    if (json instanceof Array) {
      decodedNode = {
        rootId: json[0],
        parentId: json[1], // optional
        account: json[2],
        permissions: DelegationDecoder.decodePermissions(json[3]),
        revoked: json[4],
      } as IDelegationNode
    }
    log.info(`Decoded delegation node: ${JSON.stringify(decodedNode)}`)
    return decodedNode
  }

  private static decodePermissions(bitset: number): Permission[] {
    const permissions: Permission[] = []
    if (bitset & Permission.ATTEST) {
      permissions.push(Permission.ATTEST)
    }
    if (bitset & Permission.DELEGATE) {
      permissions.push(Permission.DELEGATE)
    }
    return permissions
  }
}

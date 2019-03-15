import { Codec } from '@polkadot/types/types'
import { IDelegationRootNode, IDelegationNode } from './Delegation'
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
    const delegationRootNode: IDelegationNode = json.map((tuple: any[]) => {
      return {
        id: tuple[0],
        parentId: tuple[1],
        account: tuple[1],
        permissions: tuple[2],
        revoked: tuple[3],
      } as IDelegationNode
    })[0]
    log.info(`Decoded delegation node: ${JSON.stringify(delegationRootNode)}`)
    return delegationRootNode
  }
}

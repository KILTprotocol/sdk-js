import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult } from '@polkadot/api/promise/types'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { IPublicIdentity } from '../identity/PublicIdentity'
import {
  DelegationBaseNode,
  IDelegationBaseNode,
  IDelegationRootNode,
  IDelegationNode,
} from './Delegation'
import { decodeRootDelegation, decodeDelegationNode } from './DelegationDecoder'
import { ICType } from '../ctype/CType'

const log = factory.getLogger('DelegationRootNode')

export class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationBaseNode['id']
  ): Promise<IDelegationRootNode | undefined> {
    log.debug(
      () => `Query chain for root delegation with identifier ${delegationId}`
    )
    const root: Partial<IDelegationRootNode | undefined> = decodeRootDelegation(
      await blockchain.api.query.delegation.root(delegationId)
    )
    if (root) {
      root.id = delegationId
      return root as IDelegationRootNode
    }
    return root
  }

  public cTypeHash: ICType['hash']

  constructor(
    id: IDelegationBaseNode['id'],
    ctypeHash: ICType['hash'],
    account: IPublicIdentity['address']
  ) {
    super(id, account)
    this.cTypeHash = ctypeHash
  }

  public getRoot(blockchain: Blockchain): Promise<IDelegationRootNode> {
    return Promise.resolve(this)
  }
  public getParent(
    blockchain: Blockchain
  ): Promise<IDelegationBaseNode | undefined> {
    return Promise.resolve(undefined)
  }

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(() => `Create tx for 'delegation.createRoot'`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.delegation.createRoot(this.id, this.cTypeHash)
    return blockchain.submitTx(identity, tx)
  }

  public async verify(blockchain: Blockchain): Promise<boolean> {
    const node:
      | IDelegationRootNode
      | undefined = await DelegationRootNode.query(blockchain, this.id)
    return node !== undefined && !node.revoked
  }

  protected decodeChildNode(
    queryResult: QueryResult
  ): IDelegationNode | undefined {
    return decodeDelegationNode(queryResult)
  }
}

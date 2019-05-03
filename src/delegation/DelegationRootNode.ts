import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import { CodecResult } from '@polkadot/api/promise/types'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { DelegationBaseNode } from './Delegation'
import { decodeRootDelegation, decodeDelegationNode } from './DelegationDecoder'
import { IDelegationRootNode } from '../primitives/Delegation'
import { DelegationNode } from './DelegationNode'

const log = factory.getLogger('DelegationRootNode')

export class DelegationRootNode extends DelegationBaseNode
  implements IDelegationRootNode {
  public static async query(
    blockchain: Blockchain,
    delegationId: IDelegationRootNode['id']
  ): Promise<DelegationRootNode | undefined> {
    log.info(`:: query('${delegationId}')`)
    const root = decodeRootDelegation(
      await blockchain.api.query.delegation.root(delegationId)
    )
    if (root) {
      root.id = delegationId
      log.info(`result: ${JSON.stringify(root)}`)
      return root
    }
    log.info(`root node not found`)
    return root
  }

  public cTypeHash: IDelegationRootNode['cTypeHash']

  constructor(
    id: IDelegationRootNode['id'],
    ctypeHash: IDelegationRootNode['cTypeHash'],
    account: IDelegationRootNode['account']
  ) {
    super(id, account)
    this.cTypeHash = ctypeHash
  }

  public getRoot(blockchain: Blockchain): Promise<DelegationRootNode> {
    return Promise.resolve(this)
  }
  // tslint:disable-next-line:prefer-function-over-method
  public getParent(
    blockchain: Blockchain
  ): Promise<DelegationBaseNode | undefined> {
    return Promise.resolve(undefined)
  }

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(`:: store(${this.id})`)
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

  public async revoke(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(`:: revoke(${this.id})`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.delegation.revokeRoot(this.id)
    return blockchain.submitTx(identity, tx)
  }

  protected decodeChildNode(
    queryResult: QueryResult
  ): DelegationNode | undefined {
    return decodeDelegationNode(queryResult)
  }
}

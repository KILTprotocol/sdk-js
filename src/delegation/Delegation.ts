import { QueryResult } from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { CodecWithId } from './DelegationDecoder'
import Attestation from '../attestation/Attestation'
import { TxStatus } from '../blockchain/TxStatus'
import { IDelegationBaseNode } from '../types/Delegation'
import DelegationNode from './DelegationNode'
import DelegationRootNode from './DelegationRootNode'
import {
  getAttestationHashes,
  fetchChildren,
  getChildIds,
} from './Delegation.chain'
import { query } from '../attestation/Attestation.chain'

const log = factory.getLogger('DelegationBaseNode')

export default abstract class DelegationBaseNode
  implements IDelegationBaseNode {
  public id: IDelegationBaseNode['id']
  public account: IDelegationBaseNode['account']
  public revoked: IDelegationBaseNode['revoked'] = false

  public constructor(
    id: IDelegationBaseNode['id'],
    account: IDelegationBaseNode['account']
  ) {
    this.account = account
    this.id = id
  }

  public abstract getRoot(): Promise<DelegationRootNode>

  public abstract getParent(): Promise<DelegationBaseNode | undefined>

  public async getChildren(): Promise<DelegationNode[]> {
    log.info(` :: getChildren('${this.id}')`)
    const childIds: string[] = await getChildIds(this.id)
    const queryResults: CodecWithId[] = await fetchChildren(childIds)
    const children: DelegationNode[] = queryResults
      .map((codec: CodecWithId) => {
        const decoded: DelegationNode | undefined = this.decodeChildNode(
          codec.codec
        )
        if (decoded) {
          decoded.id = codec.id
        }
        return decoded
      })
      .filter(
        (value): value is DelegationNode => {
          return value !== undefined
        }
      )
    log.info(`children: ${JSON.stringify(children)}`)
    return children
  }

  /**
   * Gets all attestations made by a Delegation Node.
   *
   * @returns All attestations made by this Delegation Node.
   */
  public async getAttestations(): Promise<Attestation[]> {
    const attestationHashes = await this.getAttestationHashes()
    const attestations = await Promise.all(
      attestationHashes.map((claimHash: string) => {
        return query(claimHash)
      })
    )

    return attestations.filter((value): value is Attestation => !!value)
  }

  public async getAttestationHashes(): Promise<string[]> {
    return getAttestationHashes(this.id)
  }

  public abstract verify(): Promise<boolean>

  public abstract revoke(identity: Identity): Promise<TxStatus>

  /**
   * Required to avoid cyclic dependencies btw. DelegationBaseNode and DelegationNode implementations.
   */
  protected abstract decodeChildNode(
    queryResult: QueryResult
  ): DelegationNode | undefined
}

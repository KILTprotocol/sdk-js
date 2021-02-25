import { ApiPromise } from '@polkadot/api'
import { Header } from '@polkadot/types/interfaces/types'
import BN from 'bn.js'
import type {
  IIdentity,
  ISubmittableResult,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { SubscriptionPromiseOptions } from './SubscriptionPromise'

export type BlockchainStats = {
  chain: string
  nodeName: string
  nodeVersion: string
}

export interface IBlockchainApi {
  api: ApiPromise

  getStats(): Promise<BlockchainStats>
  listenToBlocks(listener: (header: Header) => void): Promise<() => void>
  signTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
  submitTxWithReSign(
    tx: SubmittableExtrinsic,
    identity?: IIdentity,
    opts?: SubscriptionPromiseOptions
  ): Promise<ISubmittableResult>
  submitTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromiseOptions
  ): Promise<ISubmittableResult>
  getNonce(accountAddress: string): Promise<BN>
  reSignTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
}

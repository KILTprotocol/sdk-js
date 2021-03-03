import { ApiPromise } from '@polkadot/api'
import { Header } from '@polkadot/types/interfaces/types'
import BN from 'bn.js'
import type {
  IIdentity,
  ISubmittableResult,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '.'

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
    opts?: SubscriptionPromise.Options
  ): Promise<ISubmittableResult>
  submitTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromise.Options
  ): Promise<ISubmittableResult>
  getNonce(accountAddress: string): Promise<BN>
  reSignTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
}

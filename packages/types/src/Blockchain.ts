/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IBlockchain
 */

import type { ApiPromise } from '@polkadot/api'
import type { Header } from '@polkadot/types/interfaces/types'
import { AnyNumber } from '@polkadot/types/types'
import type BN from 'bn.js'
import type {
  IIdentity,
  ISubmittableResult,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '.'

export type ReSignOpts = { reSign: boolean; tip: AnyNumber }
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
    tx: SubmittableExtrinsic,
    tip?: AnyNumber
  ): Promise<SubmittableExtrinsic>
  submitSignedTxWithReSign(
    tx: SubmittableExtrinsic,
    identity?: IIdentity,
    opts?: Partial<SubscriptionPromise.Options>
  ): Promise<ISubmittableResult>
  getNonce(accountAddress: string): Promise<BN>
  reSignTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
}

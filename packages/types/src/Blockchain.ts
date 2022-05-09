/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Header } from '@polkadot/types/interfaces/types'
import type { AnyNumber } from '@polkadot/types/types'
import type { BN } from '@polkadot/util'
import type {
  IIdentity,
  ISubmittableResult,
  KeyringPair,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from './index.js'

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
    signer: KeyringPair | IIdentity,
    tx: SubmittableExtrinsic,
    tip?: AnyNumber
  ): Promise<SubmittableExtrinsic>
  submitSignedTxWithReSign(
    tx: SubmittableExtrinsic,
    signer?: KeyringPair | IIdentity,
    opts?: Partial<SubscriptionPromise.Options>
  ): Promise<ISubmittableResult>
  getNonce(accountAddress: string): Promise<BN>
  reSignTx(
    signer: KeyringPair | IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
}

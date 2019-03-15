import {
  ApiPromise,
  SubmittableExtrinsic,
  SubmittableResult,
} from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import { Identity } from 'src'
import { factory } from '../config/ConfigLog'
import { TxStatus } from './TxStatus'

const log = factory.getLogger('BlockchainApi')

export interface IBlockchainApi {
  api: ApiPromise

  submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic<CodecResult, SubscriptionResult>
  ): Promise<TxStatus>
}

export class BlockchainApi implements IBlockchainApi {
  constructor(public api: ApiPromise) {}

  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic<CodecResult, SubscriptionResult>
  ): Promise<TxStatus> {
    const accountAddress = identity.address
    const nonce = await this.api.query.system.accountNonce(accountAddress)
    if (!nonce) {
      throw Error(`Nonce not found for account ${accountAddress}`)
    }
    const signed: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = identity.signSubmittableExtrinsic(tx, nonce.toHex())
    log.info(`Submitting ${tx.method}`)
    return new Promise<TxStatus>((resolve, reject) => {
      signed
        .send((result: SubmittableResult) => {
          log.info(`Got tx status '${result.status.type}'`)
          const status = result.status
          if (
            status.type === 'Finalised' &&
            status.value &&
            status.value.encodedLength > 0
          ) {
            log.info(() => `Transaction complete. Status: '${status.type}'`)
            resolve(new TxStatus(status.type))
          } else if (status.type === 'Invalid' || status.type === 'Dropped') {
            reject(new TxStatus(status.type))
          }
        })
        .catch(err => {
          log.error(err)
        })
    })
  }
}

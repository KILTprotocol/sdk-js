/**
 * @module Blockchain
 */
import { ApiPromise } from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import {
  SubmittableExtrinsic,
  SubmittableResult,
} from '@polkadot/api/SubmittableExtrinsic'
import { WsProvider } from '@polkadot/rpc-provider'
import { Header, EventRecord } from '@polkadot/types'
import { Codec, RegistryTypes } from '@polkadot/types/types'
import BN from 'bn.js'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { TxStatus } from './TxStatus'

const log = factory.getLogger('Blockchain')

export type QueryResult = Codec | undefined | null

const CUSTOM_TYPES: RegistryTypes = {
  DelegationNodeId: 'Hash',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Permissions: 'u32',
}

export enum SystemEvent {
  ExtrinsicSuccess = '0x0000',
  ExtrinsicFailed = '0x0001',
}

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain {
  public static DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'
  public static async build(
    host: string = Blockchain.DEFAULT_WS_ADDRESS
  ): Promise<Blockchain> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create({
      provider,
      types: CUSTOM_TYPES,
    })
    return new Blockchain(api)
  }

  public static asArray(queryResult: QueryResult): any[] {
    const json =
      queryResult && queryResult.encodedLength ? queryResult.toJSON() : null
    if (json instanceof Array) {
      return json
    }
    return []
  }

  public api: ApiPromise

  private constructor(api: ApiPromise) {
    this.api = api
  }

  public async getStats() {
    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version(),
    ])

    return { chain, nodeName, nodeVersion }
  }

  // TODO: implement unsubscribe as subscriptionId continuously increases
  public async listenToBlocks(listener: (header: Header) => void) {
    const subscriptionId = await this.api.rpc.chain.subscribeNewHead(listener)
    return subscriptionId
  }

  public async listenToBalanceChanges(
    accountAddress: string,
    listener?: (account: string, balance: number, change: number) => void
  ) {
    // @ts-ignore
    let previous: BN = await this.api.query.balances.freeBalance(accountAddress)

    if (listener) {
      // @ts-ignore
      this.api.query.balances.freeBalance(accountAddress, (current: BN) => {
        const change = current.sub(previous)
        previous = current
        listener(accountAddress, current.toNumber(), change.toNumber())
      })
    }
    return previous
  }

  public async getBalance(
    accountAddress: IPublicIdentity['address']
  ): Promise<number> {
    // @ts-ignore
    const balance: BN = await this.api.query.balances.freeBalance(
      accountAddress
    )
    return balance.toNumber()
  }

  public async makeTransfer(
    identity: Identity,
    accountAddressTo: string,
    amount: number
  ): Promise<TxStatus> {
    const transfer = this.api.tx.balances.transfer(accountAddressTo, amount)
    return this.submitTx(identity, transfer)
  }

  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic<CodecResult, SubscriptionResult>
  ): Promise<TxStatus> {
    const accountAddress = identity.address
    const nonce = await this.getNonce(accountAddress)
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
            log.info(`Transaction complete. Status: '${status.type}'`)
            if (Blockchain.hasExtrinsicFailed(result)) {
              log.warn(`Extrinsic execution failed`)
              log.debug(
                `Transaction detail: ${JSON.stringify(result, null, 2)}`
              )
              reject(new Error('ExtrinsicFailed'))
            } else {
              resolve(new TxStatus(status.type))
            }
          } else if (status.type === 'Invalid' || status.type === 'Dropped') {
            reject(new Error(status.type))
          }
        })
        .catch(err => {
          log.error(err)
          reject(err)
        })
    })
  }

  public async getNonce(accountAddress: string): Promise<Codec> {
    const nonce = await this.api.query.system.accountNonce(accountAddress)
    if (!nonce) {
      throw Error(`Nonce not found for account ${accountAddress}`)
    }

    return nonce
  }

  /**
   * Checks if there is `SystemEvent.ExtrinsicFailed` in the list of
   * transaction events within the given `extrinsicResult`.
   */
  private static hasExtrinsicFailed(
    extrinsicResult: SubmittableResult
  ): boolean {
    const events: EventRecord[] = extrinsicResult.events
    return (
      events.find((eventRecord: EventRecord) => {
        return (
          !eventRecord.phase.asApplyExtrinsic.isEmpty &&
          eventRecord.event.index.toHex() === SystemEvent.ExtrinsicFailed
        )
      }) !== undefined
    )
  }
}

/**
 * @module Blockchain
 */
import { ApiPromise } from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic, {
  SubmittableResult,
} from '@polkadot/api/SubmittableExtrinsic'
import { WsProvider } from '@polkadot/rpc-provider'
import { Header } from '@polkadot/types'
import Hash from '@polkadot/types/Hash'
import { Codec } from '@polkadot/types/types'
import BN from 'bn.js'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { TxStatus } from './TxStatus'

const log = factory.getLogger('Blockchain')

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
      types: {
        DelegationNodeId: 'Hash',
      },
    })
    return new Blockchain(api)
  }

  /**
   * @deprected use build instead
   */
  public static async connect(
    host: string = Blockchain.DEFAULT_WS_ADDRESS
  ): Promise<ApiPromise> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create({
      provider,
      types: {
        DelegationNodeId: 'Hash',
        Permissions: 'u32',
      },
    })
    return api
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async getStats(api: ApiPromise) {
    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version(),
    ])

    return { chain, nodeName, nodeVersion }
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async listenToBlocks(
    api: ApiPromise,
    listener: (header: Header) => void
  ) {
    const subscriptionId = await api.rpc.chain.subscribeNewHead(listener)
    return subscriptionId
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async listenToBalanceChanges(
    api: ApiPromise,
    accountAddress: string,
    listener?: (account: string, balance: BN, change: BN) => void
  ) {
    // @ts-ignore
    let previous: BN = await api.query.balances.freeBalance(accountAddress)

    if (listener) {
      // @ts-ignore
      api.query.balances.freeBalance(accountAddress, (current: BN) => {
        const change = current.sub(previous)
        previous = current
        listener(accountAddress, current, change)
      })
    }
    return previous
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async makeTransfer(
    api: ApiPromise,
    identity: Identity,
    accountAddressTo: string,
    amount: number
  ) {
    const accountAddressFrom = identity.address

    const nonce = await Blockchain.getNonce(api, accountAddressFrom)
    const transfer = api.tx.balances.transfer(accountAddressTo, amount)
    identity.signSubmittableExtrinsic(transfer, nonce.toHex())
    const hash = await transfer.send()
    return hash
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async submitTx(
    api: ApiPromise,
    identity: Identity,
    tx: SubmittableExtrinsic<CodecResult, SubscriptionResult>
  ): Promise<Hash> {
    const accountAddress = identity.address
    const nonce = await Blockchain.getNonce(api, accountAddress)
    const signed: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = identity.signSubmittableExtrinsic(tx, nonce.toHex())
    return signed.send()
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async getNonce(
    api: ApiPromise,
    accountAddress: string
  ): Promise<Codec> {
    const nonce = await api.query.system.accountNonce(accountAddress)
    if (!nonce) {
      throw Error(`Nonce not found for account ${accountAddress}`)
    }

    return nonce
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
            log.info(() => `Transaction complete. Status: '${status.type}'`)
            resolve(new TxStatus(status.type))
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
}

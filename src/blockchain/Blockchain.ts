/**
 * @module Blockchain
 */
import { ApiPromise } from '@polkadot/api'
import SubmittableExtrinsic from '@polkadot/api/promise/SubmittableExtrinsic'
import { WsProvider } from '@polkadot/rpc-provider'
import { Header } from '@polkadot/types'
import Hash from '@polkadot/types/Hash'
import { Codec } from '@polkadot/types/types'
import BN from 'bn.js'
import Identity from '../identity/Identity'

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain {
  public static DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'

  private api: ApiPromise

  public static async build(
      host: string = Blockchain.DEFAULT_WS_ADDRESS
  ): Promise<Blockchain> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create(provider)
    return new Blockchain(api)
  }

  /**
   * @deprected use build instead
   */
  public static async connect(
    host: string = Blockchain.DEFAULT_WS_ADDRESS
  ): Promise<ApiPromise> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create(provider)
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
    const accountAddressFrom = identity.signKeyringPair.address()

    const nonce = await Blockchain.getNonce(api, accountAddressFrom)
    const transfer = api.tx.balances.transfer(accountAddressTo, amount)
    transfer.sign(identity.signKeyringPair, nonce.toHex())
    const hash = await transfer.send()
    return hash
  }

  /**
   * @deprected use build and Blockchain object instead
   */
  public static async submitTx(
    api: ApiPromise,
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<Hash> {
    const accountAddress = identity.signKeyringPair.address()
    const nonce = await Blockchain.getNonce(api, accountAddress)
    const signed: SubmittableExtrinsic = tx.sign(
      identity.signKeyringPair,
      nonce.toHex()
    )
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

  private constructor(api: ApiPromise) {
    this.api = api;
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
  public async listenToBlocks(
      listener: (header: Header) => void
  ) {
    const subscriptionId = await this.api.rpc.chain.subscribeNewHead(listener)
    return subscriptionId
  }

  public async listenToBalanceChanges(
      accountAddress: string,
      listener?: (account: string, balance: BN, change: BN) => void
  ) {
    // @ts-ignore
    let previous: BN = await this.api.query.balances.freeBalance(accountAddress)

    if (listener) {
      // @ts-ignore
      this.api.query.balances.freeBalance(accountAddress, (current: BN) => {
        const change = current.sub(previous)
        previous = current
        listener(accountAddress, current, change)
      })
    }
    return previous
  }

  public async makeTransfer(
      identity: Identity,
      accountAddressTo: string,
      amount: number
  ) {
    const accountAddressFrom = identity.signKeyringPair.address()

    const nonce = await this.getNonce(accountAddressFrom)
    const transfer = this.api.tx.balances.transfer(accountAddressTo, amount)
    transfer.sign(identity.signKeyringPair, nonce.toHex())
    const hash = await transfer.send()
    return hash
  }

  public async submitTx(identity: Identity,
      tx: SubmittableExtrinsic
  ): Promise<Hash> {
    const accountAddress = identity.signKeyringPair.address()
    const nonce = await this.getNonce(accountAddress)
    const signed: SubmittableExtrinsic = tx.sign(
        identity.signKeyringPair,
        nonce.toHex()
    )
    return signed.send()
  }

  public async getNonce(accountAddress: string): Promise<Codec> {
    const nonce = await this.api.query.system.accountNonce(accountAddress)
    if (!nonce) {
      throw Error(`Nonce not found for account ${accountAddress}`)
    }

    return nonce
  }


}

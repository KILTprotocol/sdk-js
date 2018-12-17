/**
 * @module SDK
 */
import { ApiPromise } from '@polkadot/api'
import { WsProvider } from '@polkadot/rpc-provider'

export default class Blockchain {

  public static DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'

  public static async connect (host: string = Blockchain.DEFAULT_WS_ADDRESS): Promise<ApiPromise> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create(provider)
    return api
  }
}

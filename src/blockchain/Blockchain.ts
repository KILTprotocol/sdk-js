/**
 * @module SDK
 */
import { ApiPromise } from '@polkadot/api'
import { WsProvider } from '@polkadot/rpc-provider'

export default class Blockchain {
  public static async connect (
    host: string = 'ws://127.0.0.1:9944'
  ): Promise<ApiPromise> {
    const provider = new WsProvider(host)
    const api = await ApiPromise.create(provider)
    return api
  }
}

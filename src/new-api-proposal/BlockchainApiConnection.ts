import { ApiPromise, WsProvider } from '@polkadot/api'
import { BlockchainApi, IBlockchainApi } from './BlockchainApi'

export class BlockchainApiConnection {
  public static DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'

  public static instance: Promise<IBlockchainApi>

  public static async get(
    host: string = this.getNodeWebsocketUrl()
  ): Promise<IBlockchainApi> {
    if (!BlockchainApiConnection.instance) {
      BlockchainApiConnection.instance = BlockchainApiConnection.buildConnection(
        host
      )
    }
    return BlockchainApiConnection.instance
  }

  private static async buildConnection(
    host: string = BlockchainApiConnection.DEFAULT_WS_ADDRESS
  ): Promise<IBlockchainApi> {
    const provider = new WsProvider(host)
    const api: ApiPromise = await ApiPromise.create({
      provider,
      types: {
        DelegationNodeId: 'Hash',
      },
    })
    return new BlockchainApi(api)
  }

  private static getNodeWebsocketUrl() {
    return `//${process.env.REACT_APP_NODE_HOST}:${
      process.env.REACT_APP_NODE_WS_PORT
    }`
  }
}

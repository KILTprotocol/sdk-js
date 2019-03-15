import { AttestationModule } from './AttestationModule'
import { BalanceModule } from './BalanceModule'
import { IBlockchainApi } from './BlockchainApi'
import { BlockchainApiConnection } from './BlockchainApiConnection'
import { CTypeModule } from './CTypeModule'

export default class Kilt {
  public static async connect(): Promise<Kilt> {
    const blockchainApi: IBlockchainApi = await BlockchainApiConnection.get()
    return new Kilt(blockchainApi)
  }

  private constructor(private blockchainApi: IBlockchainApi) {}

  public attestations(): AttestationModule {
    return new AttestationModule(this.blockchainApi)
  }

  public balances(): BalanceModule {
    return new BalanceModule(this.blockchainApi)
  }

  public CTYPEs(): CTypeModule {
    return new CTypeModule(this.blockchainApi)
  }
}

import { Identity } from 'src'
import { IPublicIdentity } from 'src/identity/PublicIdentity'
import { TxStatus } from './TxStatus'
import { IBlockchainApi } from './BlockchainApi'
import BN from 'bn.js'

export class BalanceModule {
  constructor(private blockchain: IBlockchainApi) {}

  public async getBalance(
    accountAddress: IPublicIdentity['address']
  ): Promise<number> {
    // @ts-ignore
    const balance: BN = await this.blockchain.api.query.balances.freeBalance(
      accountAddress
    )
    return balance.toNumber()
  }

  public async listenToBalanceChanges(
    accountAddress: string,
    listener?: (account: string, balance: number, change: number) => void
  ) {
    // @ts-ignore
    let previous: BN = await this.blockchain.api.query.balances.freeBalance(
      accountAddress
    )

    if (listener) {
      await this.blockchain.api.query.balances.freeBalance(
        accountAddress,
        // @ts-ignore
        (current: BN) => {
          const change = current.sub(previous)
          previous = current
          listener(accountAddress, current.toNumber(), change.toNumber())
        }
      )
    }
    return previous
  }

  public async makeTransfer(
    identity: Identity,
    accountAddressTo: string,
    amount: number
  ): Promise<TxStatus> {
    const transfer = await this.blockchain.api.tx.balances.transfer(
      accountAddressTo,
      amount
    )
    return await this.blockchain.submitTx(identity, transfer)
  }
}

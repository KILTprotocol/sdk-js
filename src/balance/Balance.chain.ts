import BN from 'bn.js'

import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'
import { TxStatus } from '../blockchain/TxStatus'

export async function listenToBalanceChanges(
  accountAddress: string,
  listener?: (account: string, balance: number, change: number) => void
): Promise<BN> {
  const blockchain = await getCached()
  // @ts-ignore
  let previous: BN = await blockchain.api.query.balances.freeBalance(
    accountAddress
  )

  if (listener) {
    blockchain.api.query.balances.freeBalance(accountAddress, (current: BN) => {
      const change = current.sub(previous)
      previous = current
      listener(accountAddress, current.toNumber(), change.toNumber())
    })
  }
  return previous
}

export async function getBalance(
  accountAddress: IPublicIdentity['address']
): Promise<number> {
  const blockchain = await getCached()
  // @ts-ignore
  const balance: BN = await blockchain.api.query.balances.freeBalance(
    accountAddress
  )
  return balance.toNumber()
}

export async function makeTransfer(
  identity: Identity,
  accountAddressTo: string,
  amount: number
): Promise<TxStatus> {
  const blockchain = await getCached()
  const transfer = blockchain.api.tx.balances.transfer(accountAddressTo, amount)
  return blockchain.submitTx(identity, transfer)
}

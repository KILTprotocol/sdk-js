/**
 * @group integration
 */

import BN from 'bn.js'
import { Identity, BlockchainApiConnection, Blockchain } from '..'
import TransactionSubscriptionHandler from './TransactionHandler'

let blockchain: Blockchain

beforeAll(async () => {
  blockchain = await BlockchainApiConnection.getCached()
}, 30_000)

it('handles transaction result', async () => {
  const Alice = await Identity.buildFromURI('//Alice')
  const Bob = await Identity.buildFromURI('//Bob')
  const transfer = blockchain.api.tx.balances.transfer(
    Alice.address,
    new BN(10)
  )

  const subHandle = TransactionSubscriptionHandler.getSubscriptionHandle()
  console.time('LOG')
  console.timeLog('LOG', 'waiting for handle...')
  const unsubscribe = await transfer.signAndSend(
    Bob.signKeyringPair,
    subHandle.handle
  )
  const txHandler = new TransactionSubscriptionHandler(subHandle, unsubscribe)

  console.timeLog('LOG', 'waiting for Ready...')
  await txHandler.Ready
  console.timeLog('LOG', 'Ready!')

  console.timeLog('LOG', 'waiting for InBlock...')
  await txHandler.extrinsicsExecuted
  console.timeLog('LOG', 'in Block!')

  console.timeLog('LOG', 'waiting for Finalized...')
  await txHandler.Finalized
  console.timeLog('LOG', 'Finalized!')
}, 40_000)

afterAll(async () => {
  await blockchain.api.disconnect()
})

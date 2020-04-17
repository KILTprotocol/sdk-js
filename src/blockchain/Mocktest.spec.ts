import BN from 'bn.js'
import { Identity } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

it('succeeds', async () => {
  require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
    true
  )
  const alice = Identity.buildFromURI('//Alice')
  const amount = new BN(1000)
  const blockchain = await getCached()
  const transfer = blockchain.api.tx.balances.transfer(alice.address, amount)
  const result = await blockchain.submitTx(alice, transfer)
  expect(result).toMatchObject({ isFinalized: true })
})

it('succeeds then fails', async () => {
  require('../blockchainApiConnection/BlockchainApiConnection').__queueResults([
    true,
    false,
  ])
  const alice = Identity.buildFromURI('//Alice')
  const amount = new BN(1000)
  expect(makeTransfer(alice, alice.address, amount)).resolves.toMatchObject({
    isFinalized: true,
  })
  expect(makeTransfer(alice, alice.address, amount)).rejects.toThrow(
    'Transaction failed'
  )
})

import BN from 'bn.js/'
import { SubmittableResult } from '@polkadot/api'
import Identity from '../identity/Identity'
// import partial from 'lodash/partial'
import { listenToBalanceChanges, makeTransfer } from './Balance.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Balance', () => {
  const blockchain = require('../blockchain/Blockchain').default

  blockchain.api.query.balances.freeBalance = jest.fn((accountAddress, cb) => {
    if (cb) {
      setTimeout(() => {
        cb(new BN(42))
      }, 1)
    }
    return new BN(12)
  })

  it('should listen to balance changes', async done => {
    const bob = await Identity.buildFromURI('//Bob')
    const listener = (account: string, balance: BN, change: BN): void => {
      expect(account).toBe(bob.getAddress())
      expect(balance.toNumber()).toBe(42)
      expect(change.toNumber()).toBe(30)
      done()
    }

    const currentBalance = await listenToBalanceChanges(
      bob.getAddress(),
      listener
    )

    expect(currentBalance.toString()).toBeTruthy()
    expect(currentBalance.toString()).toEqual('12')
  })

  blockchain.__mockResultHash = '123'

  it('should make transfer', async () => {
    const alice = await Identity.buildFromURI('//Alice')
    const bob = await Identity.buildFromURI('//Bob')

    const status = await makeTransfer(alice, bob.getAddress(), new BN(100))
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
})

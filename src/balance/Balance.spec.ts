import BN from 'bn.js/'
import { AccountData } from '@polkadot/types/interfaces'
import Identity from '../identity/Identity'
import { listenToBalanceChanges, makeTransfer } from './Balance.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Balance', () => {
  const blockchain = require('../blockchain/Blockchain').default

  blockchain.api.query.balances.account = jest.fn((accountAddress, cb) => {
    const data: AccountData = {
      free: new BN(42),
      reserved: new BN(42),
      miscFrozen: new BN(42),
      feeFrozen: new BN(42),
    }
    if (cb) {
      setTimeout(() => {
        cb(data)
      }, 1)
    }
    return data
  })

  it('should listen to balance changes', async (done) => {
    const bob = Identity.buildFromURI('//Bob')
    const listener = (account: string, balance: BN, change: BN): void => {
      expect(account).toBe(bob.address)
      expect(balance.toNumber()).toBe(42)
      expect(change.toNumber()).toBe(30)
      done()
    }

    const currentBalance = await listenToBalanceChanges(bob.address, listener)

    expect(currentBalance.toString()).toBeTruthy()
    expect(currentBalance.toString()).toEqual('12')
  })

  blockchain.__mockResultHash = '123'

  it('should make transfer', async () => {
    const alice = Identity.buildFromURI('//Alice')
    const bob = Identity.buildFromURI('//Bob')

    const hash = await makeTransfer(alice, bob.address, new BN(100))
    expect(hash).toBe('123')
  })
})

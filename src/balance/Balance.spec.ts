import BN from 'bn.js/'
import { AccountData, AccountInfo } from '@polkadot/types/interfaces'
import { SubmittableResult } from '@polkadot/api'
import Identity from '../identity/Identity'
import { listenToBalanceChanges, makeTransfer } from './Balance.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')
const BALANCE = 42
const FEE = 30

describe('Balance', () => {
  const blockchain = require('../blockchain/Blockchain').default
  const accountInfo = (balance: number): AccountInfo => {
    return {
      data: {
        free: new BN(balance),
        reserved: new BN(balance),
        miscFrozen: new BN(balance),
        feeFrozen: new BN(balance),
      } as AccountData,
    } as AccountInfo
  }

  blockchain.api.query.system.account = jest.fn(
    (accountAddress, cb): AccountInfo => {
      if (cb) {
        setTimeout(() => {
          cb(accountInfo(BALANCE))
        }, 1)
      }
      return accountInfo(BALANCE - FEE)
    }
  )

  it('should listen to balance changes', async (done) => {
    const bob = Identity.buildFromURI('//Bob')
    const listener = (account: string, balance: BN, change: BN): void => {
      expect(account).toBe(bob.address)
      expect(balance.toNumber()).toBe(BALANCE)
      expect(change.toNumber()).toBe(FEE)
      done()
    }

    const currentBalance = await listenToBalanceChanges(bob.address, listener)

    expect(currentBalance.toString()).toBeTruthy()
    expect(currentBalance.toNumber()).toEqual(BALANCE - FEE)
  })

  blockchain.__mockResultHash = '123'

  it('should make transfer', async () => {
    const alice = Identity.buildFromURI('//Alice')
    const bob = Identity.buildFromURI('//Bob')

    const status = await makeTransfer(alice, bob.address, new BN(100))
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
})

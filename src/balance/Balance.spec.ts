import { SubmittableResult } from '@polkadot/api'
import { TypeRegistry } from '@polkadot/types'
import AccountIndex from '@polkadot/types/generic/AccountIndex'
import { AccountData, AccountInfo } from '@polkadot/types/interfaces'
import BN from 'bn.js/'
import Identity from '../identity/Identity'
import {
  getBalance,
  listenToBalanceChanges,
  makeTransfer,
} from './Balance.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const BALANCE = 42
const FEE = 30

describe('Balance', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  const registry = new TypeRegistry()

  const accountInfo = (balance: number): AccountInfo => {
    return {
      data: {
        free: new BN(balance),
        reserved: new BN(balance),
        miscFrozen: new BN(balance),
        feeFrozen: new BN(balance),
      } as AccountData,
      nonce: new AccountIndex(registry, 0),
    } as AccountInfo
  }

  blockchainApi.query.system.account = jest.fn(
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
    const bob = await Identity.buildFromURI('//Bob')
    const listener = (account: string, balance: BN, change: BN): void => {
      expect(account).toBe(bob.getAddress())
      expect(balance.toNumber()).toBe(BALANCE)
      expect(change.toNumber()).toBe(FEE)
      done()
    }

    await listenToBalanceChanges(bob.getAddress(), listener)
    const currentBalance = await getBalance(bob.getAddress())
    expect(currentBalance.toNumber()).toBeTruthy()
    expect(currentBalance.toNumber()).toEqual(BALANCE - FEE)
  })

  it('should make transfer', async () => {
    const alice = await Identity.buildFromURI('//Alice')
    const bob = await Identity.buildFromURI('//Bob')

    const status = await makeTransfer(alice, bob.getAddress(), new BN(100))
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
})

import BN from 'bn.js/'
import { SubmittableResult } from '@polkadot/api'
import { AccountInfo, AccountData } from '@polkadot/types/interfaces'
import Identity from '../identity/Identity'
import { listenToBalanceChanges, makeTransfer } from './Balance.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const BALANCE = 42
const FEE = 30

describe('Balance', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

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

  blockchainApi.query.balances.freeBalance = jest.fn(
    async (accountAddress, cb) => {
      if (cb) {
        setTimeout(() => {
          cb(accountInfo(BALANCE))
        }, 1)
      }
      return accountInfo(BALANCE - FEE)
    }
  )

  it('should listen to balance changes', async done => {
    const bob = await Identity.buildFromURI('//Bob')
    const listener = (account: string, balance: BN, change: BN): void => {
      expect(account).toBe(bob.getAddress())
      expect(balance.toNumber()).toBe(BALANCE)
      expect(change.toNumber()).toBe(FEE)
      done()
    }

    const currentBalance = await listenToBalanceChanges(
      bob.getAddress(),
      listener
    )

    expect(currentBalance.toString()).toBeTruthy()
    expect(currentBalance.toString()).toEqual('12')
  })

  it('should make transfer', async () => {
    const alice = await Identity.buildFromURI('//Alice')
    const bob = await Identity.buildFromURI('//Bob')

    const status = await makeTransfer(alice, bob.getAddress(), new BN(100))
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
})

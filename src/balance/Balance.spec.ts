import { SubmittableResult } from '@polkadot/api'
import AccountIndex from '@polkadot/types/generic/AccountIndex'
import { AccountData, AccountInfo } from '@polkadot/types/interfaces'
import BN from 'bn.js/'
import Identity from '../identity/Identity'
import {
  getBalance,
  listenToBalanceChanges,
  makeTransfer,
} from './Balance.chain'
import TYPE_REGISTRY from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import { BlockchainUtils } from '../blockchain'
import BalanceUtils from './Balance.utils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const BALANCE = 42
const FEE = 30

describe('Balance', () => {
  let alice: Identity
  let bob: Identity
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
      nonce: new AccountIndex(TYPE_REGISTRY, 0),
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
  beforeAll(async () => {
    alice = await Identity.buildFromURI('//Alice')
    bob = await Identity.buildFromURI('//Bob')
  })
  it('should listen to balance changes', async (done) => {
    const listener = (account: string, balance: BN, change: BN): void => {
      expect(account).toBe(bob.address)
      expect(balance.toNumber()).toBe(BALANCE)
      expect(change.toNumber()).toBe(FEE)
      done()
    }

    await listenToBalanceChanges(bob.address, listener)
    const currentBalance = await getBalance(bob.address)
    expect(currentBalance.toNumber()).toBeTruthy()
    expect(currentBalance.toNumber()).toEqual(BALANCE - FEE)
  })

  it('should make transfer', async () => {
    const status = await makeTransfer(
      alice,
      bob.address,
      new BN(100)
    ).then((tx) => BlockchainUtils.submitTxWithReSign(tx, alice))
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
  it('should make transfer of amount with arbitrary exponent', async () => {
    const amount = new BN(10)
    const exponent = -6
    const expectedAmount = BalanceUtils.convertToTxUnit(
      amount,
      (exponent >= 0 ? 1 : -1) * Math.floor(Math.abs(exponent))
    )
    const status = await makeTransfer(
      alice,
      bob.address,
      amount,
      exponent
    ).then((tx) => BlockchainUtils.submitTxWithReSign(tx, alice))
    expect(blockchainApi.tx.balances.transfer).toHaveBeenCalledWith(
      bob.address,
      expectedAmount
    )
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
})

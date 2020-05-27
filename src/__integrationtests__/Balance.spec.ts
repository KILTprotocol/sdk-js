/**
 * @group integration/balance
 */

import BN from 'bn.js/'
import Identity from '../identity/Identity'
import {
  getBalance,
  makeTransfer,
  listenToBalanceChanges,
} from '../balance/Balance.chain'
import { GAS, MIN_TRANSACTION, faucet, bob, alice, NewIdentity } from './utils'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

describe('when there is a dev chain with a faucet', async () => {
  it('should have enough coins available on the faucet', async () => {
    const balance = await getBalance(faucet.address)
    expect(balance.gt(new BN(100000000))).toBeTruthy()
    // console.log(`Faucet has ${Number(balance)} micro Kilt`)
  })

  it('Bob has tokens', async () => {
    const balance = await getBalance(bob.address)
    expect(balance.gt(new BN(100_000_000))).toBeTruthy()
  })

  it('Alice has tokens', async () => {
    const balance = await getBalance(alice.address)
    expect(balance.gt(new BN(100_000_000))).toBeTruthy()
  })

  it('getBalance should return 0 for new identity', async () => {
    return expect(
      getBalance(NewIdentity().address).then(n => n.toNumber())
    ).resolves.toEqual(0)
  })

  it('should be able to faucet coins to a new identity', async () => {
    const ident = NewIdentity()
    const funny = jest.fn()
    listenToBalanceChanges(ident.address, funny)
    const balanceBefore = await getBalance(faucet.address)
    await makeTransfer(faucet, ident.address, MIN_TRANSACTION)
    const [balanceAfter, balanceIdent] = await Promise.all([
      getBalance(faucet.address),
      getBalance(ident.address),
    ])
    expect(
      balanceBefore.sub(balanceAfter).eq(MIN_TRANSACTION.add(GAS))
    ).toBeTruthy()
    expect(balanceIdent.toNumber()).toBe(MIN_TRANSACTION.toNumber())
    expect(funny).toBeCalled()
  }, 15000)
})

describe('When there are haves and have-nots', async () => {
  const BobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())
  const RichieRich = alice
  const StormyD = Identity.buildFromMnemonic(Identity.generateMnemonic())

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(RichieRich, StormyD.address, MIN_TRANSACTION)
    const balanceTo = await getBalance(StormyD.address)
    expect(balanceTo.toNumber()).toBe(MIN_TRANSACTION.toNumber())
  }, 15000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalance(StormyD.address)
    await expect(
      makeTransfer(BobbyBroke, StormyD.address, MIN_TRANSACTION)
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(StormyD.address),
      getBalance(BobbyBroke.address),
    ])
    expect(newBalance.toNumber()).toBe(originalBalance.toNumber())
    expect(zeroBalance.toNumber()).toBe(0)
  }, 15000)

  it('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = await getBalance(RichieRich.address)
    await expect(
      makeTransfer(RichieRich, BobbyBroke.address, RichieBalance)
    ).rejects.toThrowError()
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(RichieRich.address),
      getBalance(BobbyBroke.address),
    ])
    expect(zeroBalance.toString()).toEqual('0')
    expect(newBalance.toString()).toEqual(RichieBalance.sub(GAS).toString())
  }, 15000)

  xit('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)
    await Promise.all([
      makeTransfer(faucet, RichieRich.address, MIN_TRANSACTION),
      makeTransfer(faucet, StormyD.address, MIN_TRANSACTION),
    ])
    expect(listener).toBeCalledWith(faucet.address)
  }, 30000)
})

afterAll(() => {
  blockchain.api.disconnect()
})

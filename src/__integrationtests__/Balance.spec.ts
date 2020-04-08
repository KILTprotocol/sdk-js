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

describe('when there is a dev chain with a faucet', () => {
  it('should have enough coins available on the faucet', async () => {
    const balance = await getBalance(faucet.address)
    expect(balance.gt(new BN(100_000_000))).toBeTruthy()
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
      getBalance(NewIdentity().address).then((n) => n.toNumber())
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
    expect(balanceBefore.sub(balanceAfter).toString()).toEqual(
      MIN_TRANSACTION.add(GAS).toString()
    )
    expect(balanceIdent.toString()).toBe(MIN_TRANSACTION.toString())
    expect(funny).toBeCalled()
  }, 15000)
})

describe('When there are haves and have-nots', () => {
  const BobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())
  const RichieRich = alice
  const StormyD = Identity.buildFromMnemonic(Identity.generateMnemonic())

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(RichieRich, StormyD.address, MIN_TRANSACTION)
    const balanceTo = await getBalance(StormyD.address)
    expect(balanceTo.toString()).toBe(MIN_TRANSACTION.toString())
  }, 30_000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalance(StormyD.address)
    await expect(
      makeTransfer(BobbyBroke, StormyD.address, MIN_TRANSACTION)
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(StormyD.address),
      getBalance(BobbyBroke.address),
    ])
    expect(newBalance.toString()).toBe(originalBalance.toString())
    expect(zeroBalance.toString()).toBe('0')
  }, 30_000)

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
  }, 30_000)

  xit('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)
    await Promise.all([
      makeTransfer(faucet, RichieRich.address, MIN_TRANSACTION),
      makeTransfer(faucet, StormyD.address, MIN_TRANSACTION),
    ])
    expect(listener).toBeCalledWith(faucet.address)
  }, 30_000)
})

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
import {
  GAS,
  MIN_TRANSACTION,
  wannabeFaucet,
  wannabeBob,
  wannabeAlice,
} from './utils'
import getCached from '../blockchainApiConnection'

describe('when there is a dev chain with a faucet', () => {
  let faucet: Identity
  let bob: Identity
  let alice: Identity

  beforeAll(async () => {
    faucet = await wannabeFaucet
    bob = await wannabeBob
    alice = await wannabeAlice
  })

  it('should have enough coins available on the faucet', async () => {
    const balance = await getBalance(faucet.getAddress())
    expect(balance.gt(new BN(100000000))).toBeTruthy()
    // console.log(`Faucet has ${Number(balance)} micro Kilt`)
  })

  it('Bob has tokens', async () => {
    const balance = await getBalance(bob.getAddress())
    expect(balance.gt(new BN(100_000_000))).toBeTruthy()
  })

  it('Alice has tokens', async () => {
    const balance = await getBalance(alice.getAddress())
    expect(balance.gt(new BN(100_000_000))).toBeTruthy()
  })

  it('getBalance should return 0 for new identity', async () => {
    return expect(
      getBalance((await Identity.buildFromMnemonic()).getAddress()).then(n =>
        n.toNumber()
      )
    ).resolves.toEqual(0)
  })

  it('should be able to faucet coins to a new identity', async () => {
    const ident = await Identity.buildFromMnemonic()
    const funny = jest.fn()
    listenToBalanceChanges(ident.getAddress(), funny)
    const balanceBefore = await getBalance(faucet.getAddress())
    await makeTransfer(faucet, ident.getAddress(), MIN_TRANSACTION)
    const [balanceAfter, balanceIdent] = await Promise.all([
      getBalance(faucet.getAddress()),
      getBalance(ident.getAddress()),
    ])
    expect(
      balanceBefore.sub(balanceAfter).eq(MIN_TRANSACTION.add(GAS))
    ).toBeTruthy()
    expect(balanceIdent.toNumber()).toBe(MIN_TRANSACTION.toNumber())
    expect(funny).toBeCalled()
  }, 15000)
})

describe('When there are haves and have-nots', () => {
  let BobbyBroke: Identity
  let RichieRich: Identity
  let StormyD: Identity
  let faucet: Identity

  beforeAll(async () => {
    BobbyBroke = await Identity.buildFromMnemonic()
    RichieRich = await wannabeAlice
    faucet = await wannabeFaucet
    StormyD = await Identity.buildFromMnemonic()
  })

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(RichieRich, StormyD.getAddress(), MIN_TRANSACTION)
    const balanceTo = await getBalance(StormyD.getAddress())
    expect(balanceTo.toNumber()).toBe(MIN_TRANSACTION.toNumber())
  }, 15000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalance(StormyD.getAddress())
    await expect(
      makeTransfer(BobbyBroke, StormyD.getAddress(), MIN_TRANSACTION)
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(StormyD.getAddress()),
      getBalance(BobbyBroke.getAddress()),
    ])
    expect(newBalance.toNumber()).toBe(originalBalance.toNumber())
    expect(zeroBalance.toNumber()).toBe(0)
  }, 15000)

  it('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = await getBalance(RichieRich.getAddress())
    await expect(
      makeTransfer(RichieRich, BobbyBroke.getAddress(), RichieBalance)
    ).rejects.toThrowError()
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(RichieRich.getAddress()),
      getBalance(BobbyBroke.getAddress()),
    ])
    expect(zeroBalance.toString()).toEqual('0')
    expect(newBalance.toString()).toEqual(RichieBalance.sub(GAS).toString())
  }, 15000)

  xit('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.getAddress(), listener)
    await Promise.all([
      makeTransfer(faucet, RichieRich.getAddress(), MIN_TRANSACTION),
      makeTransfer(faucet, StormyD.getAddress(), MIN_TRANSACTION),
    ])
    expect(listener).toBeCalledWith(faucet.getAddress())
  }, 30000)
})

afterAll(async () => {
  await getCached().then(bc => bc.api.disconnect())
})

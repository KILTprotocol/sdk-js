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
import { GAS, MIN_TRANSACTION, buildIdentities, NewIdentity } from './utils'
import getCached from '../blockchainApiConnection'

describe('when there is a dev chain with a faucet', () => {
  let faucet: Identity
  let alice: Identity
  let bob: Identity

  beforeAll(async () => {
    const {
      faucet: faucett,
      alice: alicee,
      bob: bobb,
    } = await buildIdentities()
    faucet = faucett
    alice = alicee
    bob = bobb
  })

  it('should have enough coins available on the faucet', async () => {
    const balance = await getBalance(faucet.getAddress())
    expect(balance.gt(new BN(100_000_000))).toBeTruthy()
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
      getBalance((await NewIdentity()).getAddress()).then((n) => n.toNumber())
    ).resolves.toEqual(0)
  })

  it('should be able to faucet coins to a new identity', async () => {
    const ident = await NewIdentity()
    const funny = jest.fn()
    listenToBalanceChanges(ident.getAddress(), funny)
    const balanceBefore = await getBalance(faucet.getAddress())
    await makeTransfer(faucet, ident.getAddress(), MIN_TRANSACTION)
    const [balanceAfter, balanceIdent] = await Promise.all([
      getBalance(faucet.getAddress()),
      getBalance(ident.getAddress()),
    ])
    expect(balanceBefore.sub(balanceAfter).toString()).toEqual(
      MIN_TRANSACTION.add(GAS).toString()
    )
    expect(balanceIdent.toString()).toBe(MIN_TRANSACTION.toString())
    expect(funny).toBeCalled()
  }, 30000)
})

describe('When there are haves and have-nots', () => {
  let bobbyBroke: Identity
  let richieRich: Identity
  let stormyD: Identity
  let faucet: Identity

  beforeAll(async () => {
    const { alice, faucet: faucett } = await buildIdentities()
    faucet = faucett
    richieRich = alice
    stormyD = await Identity.buildFromMnemonic()
    bobbyBroke = await Identity.buildFromMnemonic()
  })

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(richieRich, stormyD.getAddress(), MIN_TRANSACTION)
    const balanceTo = await getBalance(stormyD.getAddress())
    expect(balanceTo.toString()).toBe(MIN_TRANSACTION.toString())
  }, 30_000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalance(stormyD.getAddress())
    await expect(
      makeTransfer(bobbyBroke, stormyD.getAddress(), MIN_TRANSACTION)
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(stormyD.getAddress()),
      getBalance(bobbyBroke.getAddress()),
    ])
    expect(newBalance.toString()).toBe(originalBalance.toString())
    expect(zeroBalance.toString()).toBe('0')
  }, 30_000)

  it('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = await getBalance(richieRich.getAddress())
    await expect(
      makeTransfer(richieRich, bobbyBroke.getAddress(), RichieBalance)
    ).rejects.toThrowError()
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(richieRich.getAddress()),
      getBalance(bobbyBroke.getAddress()),
    ])
    expect(zeroBalance.toString()).toEqual('0')
    expect(newBalance.toString()).toEqual(RichieBalance.sub(GAS).toString())
  }, 30_000)

  xit('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.getAddress(), listener)
    await Promise.all([
      makeTransfer(faucet, richieRich.getAddress(), MIN_TRANSACTION),
      makeTransfer(faucet, stormyD.getAddress(), MIN_TRANSACTION),
    ])
    expect(listener).toBeCalledWith(faucet.getAddress())
  }, 30_000)
})

afterAll(() => {
  return getCached().then((bc) => bc.api.disconnect())
})

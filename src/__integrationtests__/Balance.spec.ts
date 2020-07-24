/**
 * @packageDocumentation
 * @group integration/balance
 * @ignore
 */

import BN from 'bn.js/'
import {
  getBalance,
  listenToBalanceChanges,
  makeTransfer,
} from '../balance/Balance.chain'
import { IBlockchainApi } from '../blockchain/Blockchain'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import {
  GAS,
  MIN_TRANSACTION,
  wannabeAlice,
  wannabeBob,
  wannabeFaucet,
} from './utils'

let blockchain: IBlockchainApi | undefined
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

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
      getBalance(
        (
          await Identity.buildFromMnemonic(Identity.generateMnemonic())
        ).getAddress()
      ).then((n) => n.toNumber())
    ).resolves.toEqual(0)
  })

  it('should be able to faucet coins to a new identity', async () => {
    const ident = await Identity.buildFromMnemonic(Identity.generateMnemonic())
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
  }, 30_000)
})

describe('When there are haves and have-nots', () => {
  let bobbyBroke: Identity
  let richieRich: Identity
  let stormyD: Identity
  let faucet: Identity

  beforeAll(async () => {
    bobbyBroke = await Identity.buildFromMnemonic(Identity.generateMnemonic())
    richieRich = await wannabeAlice
    faucet = await wannabeFaucet
    stormyD = await Identity.buildFromMnemonic(Identity.generateMnemonic())
  })

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(richieRich, stormyD.getAddress(), MIN_TRANSACTION)
    const balanceTo = await getBalance(stormyD.getAddress())
    expect(balanceTo.toNumber()).toBe(MIN_TRANSACTION.toNumber())
  }, 40_000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalance(stormyD.getAddress())
    await expect(
      makeTransfer(bobbyBroke, stormyD.getAddress(), MIN_TRANSACTION)
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(stormyD.getAddress()),
      getBalance(bobbyBroke.getAddress()),
    ])
    expect(newBalance.toNumber()).toBe(originalBalance.toNumber())
    expect(zeroBalance.toNumber()).toBe(0)
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
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})

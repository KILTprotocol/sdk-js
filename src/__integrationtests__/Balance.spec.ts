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
import {
  AWAIT_IN_BLOCK,
  AWAIT_READY,
  IBlockchainApi,
} from '../blockchain/Blockchain'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import {
  MIN_TRANSACTION,
  wannabeAlice,
  wannabeBob,
  wannabeFaucet,
} from './utils'

let blockchain: IBlockchainApi
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
      getBalance(
        (await Identity.buildFromMnemonic(Identity.generateMnemonic())).address
      ).then((n) => n.toNumber())
    ).resolves.toEqual(0)
  })

  it('should be able to faucet coins to a new identity', async () => {
    const ident = await Identity.buildFromMnemonic(Identity.generateMnemonic())
    const funny = jest.fn()
    listenToBalanceChanges(ident.address, funny)
    const balanceBefore = await getBalance(faucet.address)
    const tx = await makeTransfer(faucet, ident.address, MIN_TRANSACTION)
    await blockchain.submitTx(tx, AWAIT_IN_BLOCK)
    const [balanceAfter, balanceIdent] = await Promise.all([
      getBalance(faucet.address),
      getBalance(ident.address),
    ])
    expect(balanceBefore.sub(balanceAfter).gt(MIN_TRANSACTION)).toBeTruthy()
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
    await makeTransfer(
      richieRich,
      stormyD.address,
      MIN_TRANSACTION
    ).then((tx) => blockchain.submitTx(tx, AWAIT_IN_BLOCK))
    const balanceTo = await getBalance(stormyD.address)
    expect(balanceTo.toNumber()).toBe(MIN_TRANSACTION.toNumber())
  }, 40_000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalance(stormyD.address)
    await expect(
      makeTransfer(bobbyBroke, stormyD.address, MIN_TRANSACTION).then((tx) =>
        blockchain.submitTx(tx, AWAIT_IN_BLOCK)
      )
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(stormyD.address),
      getBalance(bobbyBroke.address),
    ])
    expect(newBalance.toNumber()).toBe(originalBalance.toNumber())
    expect(zeroBalance.toNumber()).toBe(0)
  }, 30_000)

  it('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = await getBalance(richieRich.address)
    await expect(
      makeTransfer(richieRich, bobbyBroke.address, RichieBalance).then((tx) =>
        blockchain.submitTx(tx, AWAIT_IN_BLOCK)
      )
    ).rejects.toThrowError()
    const [newBalance, zeroBalance] = await Promise.all([
      getBalance(richieRich.address),
      getBalance(bobbyBroke.address),
    ])
    expect(zeroBalance.toString()).toEqual('0')
    expect(newBalance.lt(RichieBalance))
  }, 30_000)

  it('should be able to make a new transaction once the last is ready', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)
    await makeTransfer(faucet, richieRich.address, MIN_TRANSACTION).then((tx) =>
      blockchain.submitTx(tx, AWAIT_READY)
    )
    await makeTransfer(faucet, stormyD.address, MIN_TRANSACTION).then((tx) =>
      blockchain.submitTx(tx, AWAIT_IN_BLOCK)
    )

    expect(listener).toBeCalledWith(
      faucet.address,
      expect.anything(),
      expect.anything()
    )
    expect(listener).toBeCalledTimes(2)
  }, 30_000)

  xit('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)
    await Promise.all([
      makeTransfer(faucet, richieRich.address, MIN_TRANSACTION).then((tx) =>
        blockchain.submitTx(tx, AWAIT_IN_BLOCK)
      ),
      makeTransfer(faucet, stormyD.address, MIN_TRANSACTION).then((tx) =>
        blockchain.submitTx(tx, AWAIT_IN_BLOCK)
      ),
    ])
    expect(listener).toBeCalledWith(faucet.address)
  }, 30_000)
})

afterAll(() => {
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})

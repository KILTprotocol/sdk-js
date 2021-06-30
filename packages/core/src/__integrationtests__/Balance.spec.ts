/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/balance
 */

import BN from 'bn.js/'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import {
  getBalances,
  listenToBalanceChanges,
  makeTransfer,
} from '../balance/Balance.chain'
import { config, disconnect } from '../kilt'
import Identity from '../identity/Identity'
import {
  MIN_TRANSACTION,
  wannabeAlice,
  wannabeBob,
  wannabeFaucet,
  WS_ADDRESS,
} from './utils'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
})

describe('when there is a dev chain with a faucet', () => {
  let faucet: Identity
  let bob: Identity
  let alice: Identity

  beforeAll(async () => {
    faucet = wannabeFaucet
    bob = wannabeBob
    alice = wannabeAlice
  })

  it('should have enough coins available on the faucet', async () => {
    const balance = await getBalances(faucet.address)
    expect(balance.free.gt(new BN(100_000_000))).toBeTruthy()
    // console.log(`Faucet has ${Number(balance)} micro Kilt`)
  })

  it('Bob has tokens', async () => {
    const balance = await getBalances(bob.address)
    expect(balance.free.gt(new BN(100_000_000))).toBeTruthy()
  })

  it('Alice has tokens', async () => {
    const balance = await getBalances(alice.address)
    expect(balance.free.gt(new BN(100_000_000))).toBeTruthy()
  })

  it('getBalances should return 0 for new identity', async () => {
    return expect(
      getBalances(
        Identity.buildFromMnemonic(Identity.generateMnemonic()).address
      ).then((n) => n.free.toNumber())
    ).resolves.toEqual(0)
  })

  it('should be able to faucet coins to a new identity', async () => {
    const ident = Identity.buildFromMnemonic(Identity.generateMnemonic())
    const funny = jest.fn()
    listenToBalanceChanges(ident.address, funny)
    const balanceBefore = await getBalances(faucet.address)
    await makeTransfer(ident.address, MIN_TRANSACTION).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, faucet, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
    const [balanceAfter, balanceIdent] = await Promise.all([
      getBalances(faucet.address),
      getBalances(ident.address),
    ])
    expect(
      balanceBefore.free.sub(balanceAfter.free).gt(MIN_TRANSACTION)
    ).toBeTruthy()
    expect(balanceIdent.free.toNumber()).toBe(MIN_TRANSACTION.toNumber())
    expect(funny).toBeCalled()
  }, 30_000)
})

describe('When there are haves and have-nots', () => {
  let bobbyBroke: Identity
  let richieRich: Identity
  let stormyD: Identity
  let faucet: Identity

  beforeAll(async () => {
    bobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())
    richieRich = wannabeAlice
    faucet = wannabeFaucet
    stormyD = Identity.buildFromMnemonic(Identity.generateMnemonic())
  })

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(stormyD.address, MIN_TRANSACTION).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, richieRich, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
    const balanceTo = await getBalances(stormyD.address)
    expect(balanceTo.free.toNumber()).toBe(MIN_TRANSACTION.toNumber())
  }, 40_000)

  it('should not accept transactions from identity with zero balance', async () => {
    const originalBalance = await getBalances(stormyD.address)
    await expect(
      makeTransfer(stormyD.address, MIN_TRANSACTION).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, bobbyBroke, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).rejects.toThrowError('1010: Invalid Transaction')
    const [newBalance, zeroBalance] = await Promise.all([
      getBalances(stormyD.address),
      getBalances(bobbyBroke.address),
    ])
    expect(newBalance.free.toNumber()).toBe(originalBalance.free.toNumber())
    expect(zeroBalance.free.toNumber()).toBe(0)
  }, 50_000)

  xit('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = await getBalances(richieRich.address)
    await expect(
      makeTransfer(bobbyBroke.address, RichieBalance.free).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, richieRich, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).rejects.toThrowError()
    const [newBalance, zeroBalance] = await Promise.all([
      getBalances(richieRich.address),
      getBalances(bobbyBroke.address),
    ])
    expect(zeroBalance.free.toString()).toEqual('0')
    expect(newBalance.free.lt(RichieBalance.free))
  }, 30_000)

  it('should be able to make a new transaction once the last is ready', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)
    await makeTransfer(richieRich.address, MIN_TRANSACTION).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, faucet, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
    await makeTransfer(stormyD.address, MIN_TRANSACTION).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, faucet, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )

    expect(listener).toBeCalledWith(
      faucet.address,
      expect.anything(),
      expect.anything()
    )
    expect(listener).toBeCalledTimes(3)
  }, 30_000)

  it('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)
    await Promise.all([
      makeTransfer(richieRich.address, MIN_TRANSACTION).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      ),
      makeTransfer(stormyD.address, MIN_TRANSACTION).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      ),
    ])
    expect(listener).toBeCalledWith(
      faucet.address,
      expect.anything(),
      expect.anything()
    )
  }, 50_000)
})

afterAll(() => {
  disconnect()
})

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/balance
 */

import { BN } from '@polkadot/util'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import type { KeyringPair, SubmittableExtrinsic } from '@kiltprotocol/types'
import {
  getBalances,
  listenToBalanceChanges,
  makeTransfer,
} from '../balance/Balance.chain'
import { config, disconnect } from '../kilt'
import {
  addressFromRandom,
  EXISTENTIAL_DEPOSIT,
  keypairFromRandom,
  devAlice,
  devBob,
  devFaucet,
  WS_ADDRESS,
} from './utils'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
})

describe('when there is a dev chain with a faucet', () => {
  let faucet: KeyringPair
  let bob: KeyringPair
  let alice: KeyringPair

  beforeAll(async () => {
    faucet = devFaucet
    bob = devBob
    alice = devAlice
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

  it('getBalances should return 0 for new address', async () => {
    return expect(
      getBalances(addressFromRandom()).then((n) => n.free.toNumber())
    ).resolves.toEqual(0)
  })

  // Skipped because it is run in parallel with other tests and it fails because of the deposit taken
  // in the other test cases.
  it.skip('should be able to faucet coins to a new address', async () => {
    const address: string = addressFromRandom()
    const funny = jest.fn()
    listenToBalanceChanges(address, funny)
    const balanceBefore = await getBalances(faucet.address)
    await makeTransfer(address, EXISTENTIAL_DEPOSIT).then(
      (tx: SubmittableExtrinsic) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
    )
    const [balanceAfter, balanceIdent] = await Promise.all([
      getBalances(faucet.address),
      getBalances(address),
    ])
    expect(
      balanceBefore.free.sub(balanceAfter.free).gt(EXISTENTIAL_DEPOSIT)
    ).toBeTruthy()
    expect(balanceIdent.free.toNumber()).toBe(EXISTENTIAL_DEPOSIT.toNumber())
    expect(funny).toBeCalled()
  }, 30_000)
})

describe('When there are haves and have-nots', () => {
  let bobbyBroke: KeyringPair
  let richieRich: KeyringPair
  let stormyD: KeyringPair
  let faucet: KeyringPair

  beforeAll(async () => {
    bobbyBroke = keypairFromRandom()
    richieRich = devAlice
    faucet = devFaucet
    stormyD = keypairFromRandom()
  })

  it('can transfer tokens from the rich to the poor', async () => {
    await makeTransfer(stormyD.address, EXISTENTIAL_DEPOSIT).then(
      (tx: SubmittableExtrinsic) =>
        BlockchainUtils.signAndSubmitTx(tx, richieRich, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
    )
    const balanceTo = await getBalances(stormyD.address)
    expect(balanceTo.free.toNumber()).toBe(EXISTENTIAL_DEPOSIT.toNumber())
  }, 40_000)

  it('should not accept transactions from KeyringPair with zero balance', async () => {
    const originalBalance = await getBalances(stormyD.address)
    await expect(
      makeTransfer(stormyD.address, EXISTENTIAL_DEPOSIT).then(
        (tx: SubmittableExtrinsic) =>
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
      makeTransfer(bobbyBroke.address, RichieBalance.free).then(
        (tx: SubmittableExtrinsic) =>
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
    await makeTransfer(richieRich.address, EXISTENTIAL_DEPOSIT).then(
      (tx: SubmittableExtrinsic) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
    )
    await makeTransfer(stormyD.address, EXISTENTIAL_DEPOSIT).then(
      (tx: SubmittableExtrinsic) =>
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
      makeTransfer(richieRich.address, EXISTENTIAL_DEPOSIT).then(
        (tx: SubmittableExtrinsic) =>
          BlockchainUtils.signAndSubmitTx(tx, faucet, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
      ),
      makeTransfer(stormyD.address, EXISTENTIAL_DEPOSIT).then(
        (tx: SubmittableExtrinsic) =>
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

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/balance
 */

import { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import type { KeyringPair } from '@kiltprotocol/types'
import { makeSigningKeyTool } from '@kiltprotocol/testing'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { getBalances, listenToBalanceChanges } from '../balance/Balance.chain'
import { disconnect } from '../kilt'
import {
  addressFromRandom,
  devAlice,
  devBob,
  devFaucet,
  EXISTENTIAL_DEPOSIT,
  initializeApi,
  submitExtrinsic,
} from './utils'

let api: ApiPromise
beforeAll(async () => {
  await initializeApi()
  api = await BlockchainApiConnection.getConnectionOrConnect()
}, 30_000)

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
    expect(balance.free.gt(new BN(100_000_000))).toBe(true)
    // console.log(`Faucet has ${Number(balance)} micro Kilt`)
  })

  it('Bob has tokens', async () => {
    const balance = await getBalances(bob.address)
    expect(balance.free.gt(new BN(100_000_000))).toBe(true)
  })

  it('Alice has tokens', async () => {
    const balance = await getBalances(alice.address)
    expect(balance.free.gt(new BN(100_000_000))).toBe(true)
  })

  it('getBalances should return 0 for new address', async () => {
    const { free } = await getBalances(addressFromRandom())
    expect(free.toNumber()).toEqual(0)
  })

  // Skipped because it is run in parallel with other tests, and it fails because of the deposit taken
  // in the other test cases.
  it('should be able to faucet coins to a new address', async () => {
    const address = addressFromRandom()
    const spy = jest.fn()
    listenToBalanceChanges(address, spy)
    const balanceBefore = await getBalances(faucet.address)
    const transferTx = api.tx.balances.transfer(address, EXISTENTIAL_DEPOSIT)
    await submitExtrinsic(transferTx, faucet)
    const balanceAfter = await getBalances(faucet.address)
    const balanceIdent = await getBalances(address)

    expect(
      balanceBefore.free.sub(balanceAfter.free).gt(EXISTENTIAL_DEPOSIT)
    ).toBe(true)
    expect(balanceIdent.free.toNumber()).toBe(EXISTENTIAL_DEPOSIT.toNumber())
    expect(spy).toBeCalled()
  }, 30_000)
})

describe('When there are haves and have-nots', () => {
  let bobbyBroke: KeyringPair
  let richieRich: KeyringPair
  let stormyD: KeyringPair
  let faucet: KeyringPair

  beforeAll(async () => {
    bobbyBroke = makeSigningKeyTool().keypair
    richieRich = devAlice
    faucet = devFaucet
    stormyD = makeSigningKeyTool().keypair
  })

  it('can transfer tokens from the rich to the poor', async () => {
    const transferTx = api.tx.balances.transfer(
      stormyD.address,
      EXISTENTIAL_DEPOSIT
    )
    await submitExtrinsic(transferTx, richieRich)
    const balanceTo = await getBalances(stormyD.address)
    expect(balanceTo.free.toNumber()).toBe(EXISTENTIAL_DEPOSIT.toNumber())
  }, 40_000)

  it('should not accept transactions from KeyringPair with zero balance', async () => {
    const originalBalance = await getBalances(stormyD.address)
    const transferTx = api.tx.balances.transfer(
      stormyD.address,
      EXISTENTIAL_DEPOSIT
    )
    await expect(submitExtrinsic(transferTx, bobbyBroke)).rejects.toThrowError(
      '1010: Invalid Transaction'
    )

    const newBalance = await getBalances(stormyD.address)
    const zeroBalance = await getBalances(bobbyBroke.address)
    expect(newBalance.free.toNumber()).toBe(originalBalance.free.toNumber())
    expect(zeroBalance.free.toNumber()).toBe(0)
  }, 50_000)

  it.skip('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = await getBalances(richieRich.address)
    const transferTx = api.tx.balances.transfer(
      bobbyBroke.address,
      RichieBalance.free
    )
    await expect(submitExtrinsic(transferTx, richieRich)).rejects.toThrowError()

    const newBalance = await getBalances(stormyD.address)
    const zeroBalance = await getBalances(bobbyBroke.address)
    expect(zeroBalance.free.toString()).toEqual('0')
    expect(newBalance.free.lt(RichieBalance.free))
  }, 30_000)

  it('should be able to make a new transaction once the last is ready', async () => {
    const spy = jest.fn()
    listenToBalanceChanges(faucet.address, spy)

    const transferTx1 = api.tx.balances.transfer(
      richieRich.address,
      EXISTENTIAL_DEPOSIT
    )
    await submitExtrinsic(transferTx1, faucet)
    const transferTx2 = api.tx.balances.transfer(
      stormyD.address,
      EXISTENTIAL_DEPOSIT
    )
    await submitExtrinsic(transferTx2, faucet)

    expect(spy).toBeCalledWith(
      faucet.address,
      expect.anything(),
      expect.anything()
    )
    expect(spy).toBeCalledTimes(3)
  }, 30_000)

  it('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn()
    listenToBalanceChanges(faucet.address, listener)

    const batch = api.tx.utility.batchAll([
      api.tx.balances.transfer(richieRich.address, EXISTENTIAL_DEPOSIT),
      api.tx.balances.transfer(stormyD.address, EXISTENTIAL_DEPOSIT),
    ])
    await submitExtrinsic(batch, faucet)

    expect(listener).toBeCalledWith(
      faucet.address,
      expect.anything(),
      expect.anything()
    )
  }, 50_000)
})

afterAll(async () => {
  await disconnect()
})

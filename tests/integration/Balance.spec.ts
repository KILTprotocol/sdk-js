/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { jest } from '@jest/globals'

import { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'

import { disconnect } from '@kiltprotocol/core'
import type { KeyringPair } from '@kiltprotocol/types'

import { makeSigningKeyTool } from '../testUtils/index.js'
import {
  addressFromRandom,
  devAlice,
  devBob,
  devFaucet,
  EXISTENTIAL_DEPOSIT,
  initializeApi,
  submitTx,
} from './utils.js'

let api: ApiPromise
beforeAll(async () => {
  api = await initializeApi()
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
    const balance = (await api.query.system.account(faucet.address)).data
    expect(balance.free.gt(new BN(100_000_000))).toBe(true)
    // console.log(`Faucet has ${Number(balance)} micro Kilt`)
  })

  it('Bob has tokens', async () => {
    const balance = (await api.query.system.account(bob.address)).data
    expect(balance.free.gt(new BN(100_000_000))).toBe(true)
  })

  it('Alice has tokens', async () => {
    const balance = (await api.query.system.account(alice.address)).data
    expect(balance.free.gt(new BN(100_000_000))).toBe(true)
  })

  it('getBalances should return 0 for new address', async () => {
    const { free } = (await api.query.system.account(addressFromRandom())).data
    expect(free.toNumber()).toEqual(0)
  })

  // Skipped because it is run in parallel with other tests, and it fails because of the deposit taken
  // in the other test cases.
  it('should be able to faucet coins to a new address', async () => {
    const address = addressFromRandom()
    const spy = jest.fn<any>()
    api.query.system.account(address, spy)
    const balanceBefore = (await api.query.system.account(faucet.address)).data
    const transferTx = api.tx.balances.transfer(address, EXISTENTIAL_DEPOSIT)
    await submitTx(transferTx, faucet)
    const balanceAfter = (await api.query.system.account(faucet.address)).data
    const balanceIdent = (await api.query.system.account(address)).data

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
    bobbyBroke = (await makeSigningKeyTool()).keypair
    richieRich = devAlice
    faucet = devFaucet
    stormyD = (await makeSigningKeyTool()).keypair
  })

  it('can transfer tokens from the rich to the poor', async () => {
    const transferTx = api.tx.balances.transfer(
      stormyD.address,
      EXISTENTIAL_DEPOSIT
    )
    await submitTx(transferTx, richieRich)
    const balanceTo = (await api.query.system.account(stormyD.address)).data
    expect(balanceTo.free.toNumber()).toBe(EXISTENTIAL_DEPOSIT.toNumber())
  }, 40_000)

  it('should not accept transactions from KeyringPair with zero balance', async () => {
    const originalBalance = (await api.query.system.account(stormyD.address))
      .data
    const transferTx = api.tx.balances.transfer(
      stormyD.address,
      EXISTENTIAL_DEPOSIT
    )
    await expect(submitTx(transferTx, bobbyBroke)).rejects.toThrowError(
      '1010: Invalid Transaction'
    )

    const newBalance = (await api.query.system.account(stormyD.address)).data
    const zeroBalance = (await api.query.system.account(bobbyBroke.address))
      .data
    expect(newBalance.free.toNumber()).toBe(originalBalance.free.toNumber())
    expect(zeroBalance.free.toNumber()).toBe(0)
  }, 50_000)

  it.skip('should not accept transactions when sender cannot pay gas, but will keep gas fee', async () => {
    const RichieBalance = (await api.query.system.account(richieRich.address))
      .data
    const transferTx = api.tx.balances.transfer(
      bobbyBroke.address,
      RichieBalance.free
    )
    await expect(submitTx(transferTx, richieRich)).rejects.toThrowError()

    const newBalance = (await api.query.system.account(stormyD.address)).data
    const zeroBalance = (await api.query.system.account(bobbyBroke.address))
      .data
    expect(zeroBalance.free.toString()).toEqual('0')
    expect(newBalance.free.lt(RichieBalance.free))
  }, 30_000)

  it('should be able to make a new transaction once the last is ready', async () => {
    const spy = jest.fn<any>()
    api.query.system.account(faucet.address, spy)

    const transferTx1 = api.tx.balances.transfer(
      richieRich.address,
      EXISTENTIAL_DEPOSIT
    )
    await submitTx(transferTx1, faucet)
    const transferTx2 = api.tx.balances.transfer(
      stormyD.address,
      EXISTENTIAL_DEPOSIT
    )
    await submitTx(transferTx2, faucet)

    expect(spy).toBeCalledTimes(3)
  }, 30_000)

  it('should be able to make multiple transactions at once', async () => {
    const listener = jest.fn<any>()
    api.query.system.account(faucet.address, listener)

    const batch = api.tx.utility.batchAll([
      api.tx.balances.transfer(richieRich.address, EXISTENTIAL_DEPOSIT),
      api.tx.balances.transfer(stormyD.address, EXISTENTIAL_DEPOSIT),
    ])
    await submitTx(batch, faucet)

    expect(listener).toBeCalledTimes(2)
  }, 50_000)
})

afterAll(async () => {
  await disconnect()
})

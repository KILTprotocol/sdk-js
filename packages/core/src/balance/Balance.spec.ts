/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/balance
 */

import { SubmittableResult } from '@polkadot/api'
import { GenericAccountIndex as AccountIndex } from '@polkadot/types/generic/AccountIndex'
import type { AccountData, AccountInfo } from '@polkadot/types/interfaces'
import { BN } from '@polkadot/util'
import {
  TypeRegistry as TYPE_REGISTRY,
  BlockchainUtils,
} from '@kiltprotocol/chain-helpers'

import type { Balances, KeyringPair } from '@kiltprotocol/types'
import { Keyring } from '@kiltprotocol/utils'
import {
  getBalances,
  listenToBalanceChanges,
  makeTransfer,
} from './Balance.chain'
import BalanceUtils from './Balance.utils'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

const BALANCE = 42
const FEE = 30

describe('Balance', () => {
  Kilt.config({ address: 'ws://testSting' })
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 38 })
  let alice: KeyringPair
  let bob: KeyringPair
  const blockchainApi =
    require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection').__mocked_api

  const accountInfo = (balance: number): AccountInfo => {
    return {
      data: {
        free: new BN(balance),
        reserved: new BN(balance),
        miscFrozen: new BN(balance),
        feeFrozen: new BN(balance),
      } as AccountData,
      nonce: new AccountIndex(TYPE_REGISTRY, 0),
    } as AccountInfo
  }

  blockchainApi.query.system.account = jest.fn(
    (accountAddress, cb): AccountInfo => {
      if (cb) {
        setTimeout(() => {
          cb(accountInfo(BALANCE))
        }, 1)
      }
      return accountInfo(BALANCE - FEE)
    }
  )
  beforeAll(async () => {
    alice = keyring.addFromUri('//Alice')
    bob = keyring.addFromUri('//Bob')
  })
  it('should listen to balance changes', async (done) => {
    const listener = (
      account: string,
      balances: Balances,
      changes: Balances
    ): void => {
      expect(account).toBe(bob.address)
      expect(balances.free.toNumber()).toBe(BALANCE)
      expect(changes.free.toNumber()).toBe(FEE)
      done()
    }

    await listenToBalanceChanges(bob.address, listener)
    const currentBalance = await getBalances(bob.address)
    expect(currentBalance.free.toNumber()).toBeTruthy()
    expect(currentBalance.free.toNumber()).toEqual(BALANCE - FEE)
  })

  it('should make transfer', async () => {
    const status = await makeTransfer(bob.address, new BN(100)).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, alice, { reSign: true })
    )
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
  it('should make transfer of amount with arbitrary exponent', async () => {
    const amount = new BN(10)
    const exponent = -6.312513431
    const expectedAmount = BalanceUtils.convertToTxUnit(
      amount,
      (exponent >= 0 ? 1 : -1) * Math.floor(Math.abs(exponent))
    )
    const status = await makeTransfer(bob.address, amount, exponent).then(
      (tx) => BlockchainUtils.signAndSubmitTx(tx, alice, { reSign: true })
    )
    expect(blockchainApi.tx.balances.transfer).toHaveBeenCalledWith(
      bob.address,
      expectedAmount
    )
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBeTruthy()
  })
})

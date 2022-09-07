/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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

import { Blockchain } from '@kiltprotocol/chain-helpers'
import type { Balances, KeyringPair } from '@kiltprotocol/types'
import { Keyring, ss58Format } from '@kiltprotocol/utils'
import { ApiMocks } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'

import { getBalances, listenToBalanceChanges } from './Balance.chain'

const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

const BALANCE = 42
const FEE = 30

describe('Balance', () => {
  const keyring = new Keyring({ type: 'sr25519', ss58Format })
  let alice: KeyringPair
  let bob: KeyringPair

  function accountInfo(balance: number): AccountInfo {
    return {
      data: {
        free: new BN(balance),
        reserved: new BN(balance),
        miscFrozen: new BN(balance),
        feeFrozen: new BN(balance),
      } as AccountData,
      nonce: new AccountIndex(mockedApi.registry, 0),
    } as AccountInfo
  }

  mockedApi.query.system.account = jest.fn(
    (accountAddress, cb): AccountInfo => {
      if (typeof cb === 'function') {
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
  it('should listen to balance changes', (done) => {
    function listener(
      account: string,
      balances: Balances,
      changes: Balances
    ): void {
      expect(account).toBe(bob.address)
      expect(balances.free.toNumber()).toBe(BALANCE)
      expect(changes.free.toNumber()).toBe(FEE)
      done()
    }

    listenToBalanceChanges(bob.address, listener)
  })

  it('should get the balance', async () => {
    const currentBalance = await getBalances(bob.address)
    expect(currentBalance.free.toNumber()).toEqual(BALANCE - FEE)
  })

  it('should make transfer', async () => {
    const api = ConfigService.get('api')
    const transferTx = api.tx.balances.transfer(bob.address, new BN(100))
    const status = await Blockchain.signAndSubmitTx(transferTx, alice)
    expect(status).toBeInstanceOf(SubmittableResult)
    expect(status.isFinalized).toBe(true)
  })
})

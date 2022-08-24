/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/blockchain
 */

/* eslint-disable dot-notation */
import type { KeyringPair } from '@polkadot/keyring/types'
import { Keyring, ss58Format } from '@kiltprotocol/utils'
import { ApiMocks } from '@kiltprotocol/testing'
import { setConnection } from '../blockchainApiConnection/BlockchainApiConnection'
import {
  IS_FINALIZED,
  isRecoverableTxError,
  parseSubscriptionOptions,
  submitSignedTx,
} from './Blockchain'

let api: any

beforeAll(() => {
  api = ApiMocks.getMockedApi()
  setConnection(Promise.resolve(api))
})

describe('Blockchain', () => {
  describe('submitSignedTx', () => {
    let alice: KeyringPair
    let bob: KeyringPair

    beforeAll(async () => {
      const keyring = new Keyring({
        type: 'ed25519',
        ss58Format,
      })
      alice = keyring.createFromUri('//Alice')
      bob = keyring.createFromUri('//Bob')
    })

    it('catches ERROR_TRANSACTION_USURPED and discovers as recoverable', async () => {
      api.__setDefaultResult({ isUsurped: true })
      const tx = api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice)
      const error = await submitSignedTx(tx, parseSubscriptionOptions()).catch(
        (e) => e
      )
      expect(isRecoverableTxError(error)).toBe(true)
    }, 20_000)

    it('catches priority error and discovers as recoverable', async () => {
      api.__setDefaultResult()
      const tx = api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice)
      tx.send = jest.fn().mockRejectedValue(Error('1014: Priority is too low:'))
      const error = await submitSignedTx(tx, parseSubscriptionOptions()).catch(
        (e) => e
      )
      expect(isRecoverableTxError(error)).toBe(true)
    }, 20_000)

    it('catches Already Imported error and discovers as recoverable', async () => {
      api.__setDefaultResult()
      const tx = api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice)
      tx.send = jest
        .fn()
        .mockRejectedValue(Error('Transaction Already Imported'))
      const error = await submitSignedTx(tx, parseSubscriptionOptions()).catch(
        (e) => e
      )
      expect(isRecoverableTxError(error)).toBe(true)
    }, 20_000)

    it('catches Outdated/Stale Tx error and discovers as recoverable', async () => {
      api.__setDefaultResult()
      const tx = api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice)
      tx.send = jest
        .fn()
        .mockRejectedValue(
          Error('1010: Invalid Transaction: Transaction is outdated')
        )
      const error = await submitSignedTx(tx, parseSubscriptionOptions()).catch(
        (e) => e
      )
      expect(isRecoverableTxError(error)).toBe(true)
    }, 20_000)
  })

  describe('parseSubscriptionOptions', () => {
    it('takes incomplete SubscriptionPromiseOptions and sets default values where needed', async () => {
      function testFunction() {
        return true
      }

      expect(parseSubscriptionOptions()).toEqual({
        resolveOn: IS_FINALIZED,
        rejectOn: expect.any(Function),
        timeout: undefined,
      })

      expect(parseSubscriptionOptions({ resolveOn: testFunction })).toEqual({
        resolveOn: testFunction,
        rejectOn: expect.any(Function),
        timeout: undefined,
      })

      expect(
        parseSubscriptionOptions({
          resolveOn: testFunction,
          rejectOn: testFunction,
        })
      ).toEqual({
        resolveOn: testFunction,
        rejectOn: testFunction,
        timeout: undefined,
      })

      expect(
        parseSubscriptionOptions({
          resolveOn: testFunction,
          timeout: 10,
        })
      ).toEqual({
        resolveOn: testFunction,
        rejectOn: expect.any(Function),
        timeout: 10,
      })

      expect(
        parseSubscriptionOptions({
          timeout: 10,
        })
      ).toEqual({
        resolveOn: IS_FINALIZED,
        rejectOn: expect.any(Function),
        timeout: 10,
      })
    })
  })
})

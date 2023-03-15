/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/blockchain
 */

import { ApiMocks } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'
import type { KeyringPair } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import {
  IS_FINALIZED,
  IS_IN_BLOCK,
  IS_READY,
  signAndSubmitTx,
} from './Blockchain'

let api: any

beforeEach(() => {
  api = ApiMocks.getMockedApi()
  ConfigService.set({ api })
})

describe('Blockchain', () => {
  describe('submitSignedTx', () => {
    let pair: KeyringPair

    beforeAll(async () => {
      pair = Crypto.makeKeypairFromUri('//Alice')
    })

    it('allows waiting for finalization', async () => {
      api.__setDefaultResult({ isFinalized: true })
      const tx = api.tx.balances.transfer('abcdef', 50)
      expect(
        await signAndSubmitTx(tx, pair, { resolveOn: IS_FINALIZED })
      ).toHaveProperty('isFinalized', true)
    })

    it('allows waiting for in block', async () => {
      api.__setDefaultResult({ isInBlock: true })
      const tx = api.tx.balances.transfer('abcdef', 50)
      expect(
        await signAndSubmitTx(tx, pair, { resolveOn: IS_IN_BLOCK })
      ).toHaveProperty('isInBlock', true)
    })

    it('allows waiting for ready', async () => {
      api.__setDefaultResult({ isReady: true })
      const tx = api.tx.balances.transfer('abcdef', 50)
      expect(
        await signAndSubmitTx(tx, pair, { resolveOn: IS_READY })
      ).toHaveProperty('status.isReady', true)
    })

    it('uses default resolution config', async () => {
      api.__setDefaultResult({ isReady: true })
      ConfigService.set({ submitTxResolveOn: IS_READY })
      let tx = api.tx.balances.transfer('abcdef', 50)
      expect(await signAndSubmitTx(tx, pair)).toHaveProperty(
        'status.isReady',
        true
      )

      api.__setDefaultResult({ isInBlock: true })
      ConfigService.set({ submitTxResolveOn: IS_IN_BLOCK })
      tx = api.tx.balances.transfer('abcdef', 50)
      expect(await signAndSubmitTx(tx, pair)).toHaveProperty('isInBlock', true)

      api.__setDefaultResult({ isFinalized: true })
      ConfigService.set({ submitTxResolveOn: IS_FINALIZED })
      tx = api.tx.balances.transfer('abcdef', 50)
      expect(await signAndSubmitTx(tx, pair)).toHaveProperty(
        'isFinalized',
        true
      )
    })

    it('rejects on error condition', async () => {
      api.__setDefaultResult({ isInvalid: true })
      const tx = api.tx.balances.transfer('abcdef', 50)
      await expect(
        signAndSubmitTx(tx, pair, { resolveOn: IS_FINALIZED })
      ).rejects.toHaveProperty('isError', true)
    })

    it('throws if subscriptions not supported', async () => {
      api.hasSubscriptions = false
      const tx = api.tx.balances.transfer('abcdef', 50)
      await expect(
        signAndSubmitTx(tx, pair, { resolveOn: IS_FINALIZED })
      ).rejects.toThrow(SDKErrors.SubscriptionsNotSupportedError)
    })

    it('rejects if disconnected', async () => {
      api.__setDefaultResult({ isReady: true })
      api.once.mockImplementation((ev: string, callback: () => void) => {
        // mock disconnect 500 ms after submission
        if (ev === 'disconnected') setTimeout(callback, 500)
      })
      const tx = api.tx.balances.transfer('abcdef', 50)
      await expect(
        signAndSubmitTx(tx, pair, { resolveOn: IS_FINALIZED })
      ).rejects.toHaveProperty('internalError', expect.any(Error))
    })
  })
})

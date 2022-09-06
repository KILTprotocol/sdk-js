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
import { ApiMocks } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'

import { IS_FINALIZED, parseSubscriptionOptions } from './Blockchain'

let api: any

beforeAll(() => {
  api = ApiMocks.getMockedApi()
  ConfigService.set({ api })
})

describe('Blockchain', () => {
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

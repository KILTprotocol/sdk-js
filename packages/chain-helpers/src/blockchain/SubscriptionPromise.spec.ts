/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/util
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type { SubscriptionPromise } from '@kiltprotocol/types'
import { makeSubscriptionPromise } from './SubscriptionPromise'

const RESOLVE = 'resolve'
const REJECT = 'reject'

const RESOLVE_ON: SubscriptionPromise.Evaluator<string> = (value) =>
  value === RESOLVE

const REJECT_ON: SubscriptionPromise.Evaluator<string> = (value) =>
  value === REJECT && 'error'

it('rejects promise on timeout', async () => {
  const { promise, subscription } = makeSubscriptionPromise({
    resolveOn: RESOLVE_ON,
    rejectOn: REJECT_ON,
    timeout: 500,
  })
  subscription('something else')
  await expect(promise).rejects.toThrow(SDKErrors.ERROR_TIMEOUT)
})

it('resolves the promise', async () => {
  const { promise, subscription } = makeSubscriptionPromise({
    resolveOn: RESOLVE_ON,
    rejectOn: REJECT_ON,
  })
  subscription(RESOLVE)
  await expect(promise).resolves.toEqual(RESOLVE)
})

it('rejects the promise', async () => {
  const { promise, subscription } = makeSubscriptionPromise({
    resolveOn: RESOLVE_ON,
    rejectOn: REJECT_ON,
  })
  subscription(REJECT)
  await expect(promise).rejects.toEqual('reject')
})

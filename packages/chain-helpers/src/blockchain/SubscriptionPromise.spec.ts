/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/util
 */

import { SDKErrors } from '@kiltprotocol/utils'
import { makeSubscriptionPromise } from './SubscriptionPromise'

const RESOLVE = 'resolve'
const REJECT = 'reject'

function RESOLVE_ON(value: string): boolean {
  return value === RESOLVE
}

function REJECT_ON(value: string): boolean | string {
  return value === REJECT && 'error'
}

it('rejects promise on timeout', async () => {
  const { promise, subscription } = makeSubscriptionPromise({
    resolveOn: RESOLVE_ON,
    rejectOn: REJECT_ON,
    timeout: 500,
  })
  subscription('something else')
  await expect(promise).rejects.toThrow(SDKErrors.TimeoutError)
})

it('resolves the promise', async () => {
  const { promise, subscription } = makeSubscriptionPromise({
    resolveOn: RESOLVE_ON,
    rejectOn: REJECT_ON,
  })
  subscription(RESOLVE)
  expect(await promise).toEqual(RESOLVE)
})

it('rejects the promise', async () => {
  const { promise, subscription } = makeSubscriptionPromise({
    resolveOn: RESOLVE_ON,
    rejectOn: REJECT_ON,
  })
  subscription(REJECT)
  await expect(promise).rejects.toEqual('reject')
})

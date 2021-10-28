/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/util
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type { SubscriptionPromise } from '@kiltprotocol/types'
import {
  makeSubscriptionPromise,
  makeSubscriptionPromiseMulti,
} from './SubscriptionPromise'

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
  await expect(promise).rejects.toThrow(SDKErrors.ERROR_TIMEOUT())
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
  await expect(promise).rejects.toEqual('error')
})
describe('makeSubscriptionPromiseMulti', () => {
  it('rejects promise dependent on each timeout', async () => {
    const ALTERNATE_RESOLVE: SubscriptionPromise.Evaluator<string> = (value) =>
      value === 'resolving'
    const ALTERNATE_REJECT: SubscriptionPromise.Evaluator<string> = (value) =>
      value === 'resolving' && 'error'
    const { promises, subscription } = makeSubscriptionPromiseMulti([
      {
        resolveOn: RESOLVE_ON,
        rejectOn: REJECT_ON,
        timeout: 500,
      },
      {
        resolveOn: ALTERNATE_RESOLVE,
        rejectOn: REJECT_ON,
      },
      {
        resolveOn: RESOLVE_ON,
        rejectOn: ALTERNATE_REJECT,
      },
    ])
    subscription('resolving')
    await expect(promises[1]).resolves.toEqual('resolving')
    await expect(promises[2]).rejects.toEqual('error')
    await expect(promises[0]).rejects.toThrow(SDKErrors.ERROR_TIMEOUT())
  })
})

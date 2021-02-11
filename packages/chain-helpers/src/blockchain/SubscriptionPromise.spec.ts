/**
 * @packageDocumentation
 * @group unit/util
 * @ignore
 */

import { SDKErrors } from '@kiltprotocol/utils'
import { Evaluator, makeSubscriptionPromise } from './SubscriptionPromise'

const RESOLVE = 'resolve'
const REJECT = 'reject'

const RESOLVE_ON: Evaluator<string> = (value) => value === RESOLVE

const REJECT_ON: Evaluator<string> = (value) => value === REJECT && 'error'

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

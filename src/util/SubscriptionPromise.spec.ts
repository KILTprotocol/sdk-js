import {
  Evaluator,
  makeSubscriptionPromise,
} from './SubscriptionPromise'

const RESOLVE = 'resolve'
const REJECT = 'reject'

const RESOLVE_ON: Evaluator<string, string> = (value) => [
  value === RESOLVE,
  value,
]
const REJECT_ON: Evaluator<string, string> = (value) => [
  value === REJECT,
  value,
]

describe('function', () => {
  it('resolves the promise', async () => {
    const { promise, subscription } = makeSubscriptionPromise(
      [RESOLVE_ON],
      [REJECT_ON]
    )
    subscription(RESOLVE)
    await expect(promise).resolves.toEqual(RESOLVE)
  })

  it('rejects the promise', async () => {
    const { promise, subscription } = makeSubscriptionPromise(
      [RESOLVE_ON],
      [REJECT_ON]
    )
    subscription(REJECT)
    await expect(promise).rejects.toEqual(REJECT)
  })
})

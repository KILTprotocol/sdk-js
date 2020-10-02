import { ERROR_TIMEOUT } from '../errorhandling/SDKErrors'

export interface Evaluator<I, O> {
  (value: I): [boolean, O]
}

export function makeSubscriptionPromise<SubscriptionType, PromiseType>(
  resolveOn: Array<Evaluator<SubscriptionType, PromiseType>>,
  rejectOn: Array<Evaluator<SubscriptionType, any>>,
  timeout?: number
): {
  promise: Promise<PromiseType>
  subscription: (value: SubscriptionType) => void
} {
  let resolve: (value: PromiseType) => void
  let reject: (reason: any) => void
  const promise = new Promise<PromiseType>((res, rej) => {
    resolve = res
    reject = rej
  })
  const subscription: (value: SubscriptionType) => void = (value) => {
    rejectOn.forEach((evaluator) => {
      const [rejected, rejectValue] = evaluator(value)
      if (rejected) reject(rejectValue)
    })
    resolveOn.forEach((evaluator) => {
      const [resolved, resolveValue] = evaluator(value)
      if (resolved) resolve(resolveValue)
    })
  }
  if (timeout)
    setTimeout(() => {
      reject(ERROR_TIMEOUT())
    }, timeout)
  return { promise, subscription }
}

export function makeSubscriptionPromiseMulti<SubscriptionType, PromiseType>(
  args: Array<{
    resolveOn: Array<Evaluator<SubscriptionType, PromiseType>>
    rejectOn: Array<Evaluator<SubscriptionType, any>>
    timeout?: number
  }>
): {
  promises: Array<Promise<PromiseType>>
  subscription: (value: SubscriptionType) => void
} {
  const promises: Array<Promise<PromiseType>> = []
  let subscriptions: Array<(value: SubscriptionType) => void>
  args.forEach(({ resolveOn, rejectOn, timeout }) => {
    const { promise, subscription } = makeSubscriptionPromise(
      resolveOn,
      rejectOn,
      timeout
    )
    promises.push(promise)
    subscriptions.push(subscription)
  })
  const subscription = (value: SubscriptionType): void => {
    subscriptions.forEach((s) => s(value))
  }
  return { promises, subscription }
}

import { ERROR_TIMEOUT } from '../errorhandling/SDKErrors'

/**
 * A function that determines whether a new incoming value should reject or resolve the promise.
 *
 * @param value A new incoming subscription value.
 * @returns A truthy value if the promise should be rejected/resolved on this value. Return value is used
 * as the reason in a rejected promise.
 */
export interface Evaluator<SubscriptionType> {
  (value: SubscriptionType): boolean | any
}

/**
 * Helps building a promise associated to a subscription callback through which updates can be pushed to the promise.
 * This promise is resolved with the value of latest update when a resolution criterion is met.
 * It is rejected with a custom error/reason if a rejection criterion is met or on timeout (optional). Rejection takes precedent.
 *
 * @param resolveOn Resolution criterion. A function that evaluates an incoming update from the subscription.
 * If it returns a truthy value, the promise is resolved with the value of the latest update.
 * @param rejectOn Rejection criterion. A function that evaluates an incoming update from the subscription.
 * If it returns a truthy value, this value is used as rejection reason.
 * @param timeout Timeout in ms. If set, the promise will reject if not resolved before the time is up.
 * @returns An object containing both a subscription callback
 * and a promise which resolves or rejects depending on the values pushed to the callback.
 */
export function makeSubscriptionPromise<SubscriptionType>(
  resolveOn: Evaluator<SubscriptionType>,
  rejectOn?: Evaluator<SubscriptionType>,
  timeout?: number
): {
  promise: Promise<SubscriptionType>
  subscription: (value: SubscriptionType) => void
} {
  let resolve: (value: SubscriptionType) => void
  let reject: (reason: any) => void
  const promise = new Promise<SubscriptionType>((res, rej) => {
    resolve = res
    reject = rej
  })
  const subscription: (value: SubscriptionType) => void =
    typeof rejectOn === 'function'
      ? (value) => {
          const rejectedReason = rejectOn(value)
          if (rejectedReason) reject(rejectedReason)
          const resolved = resolveOn(value)
          if (resolved) resolve(value)
        }
      : (value) => {
          const resolved = resolveOn(value)
          if (resolved) resolve(value)
        }
  if (timeout)
    setTimeout(() => {
      reject(ERROR_TIMEOUT())
    }, timeout)
  return { promise, subscription }
}

/**
 * A wrapper around [[makeSubscriptionPromise]] that helps building multiple promises which listen to the same subscription.
 *
 * @param args An array of objects each of which provides the arguments for creation of one promise.
 * @returns An object containing both a subscription callback
 * and an array of promises which resolve or reject depending on the values pushed to the callback.
 */
export function makeSubscriptionPromiseMulti<SubscriptionType>(
  args: Array<{
    resolveOn: Evaluator<SubscriptionType>
    rejectOn?: Evaluator<SubscriptionType>
    timeout?: number
  }>
): {
  promises: Array<Promise<SubscriptionType>>
  subscription: (value: SubscriptionType) => void
} {
  const promises: Array<Promise<SubscriptionType>> = []
  const subscriptions: Array<(value: SubscriptionType) => void> = []
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

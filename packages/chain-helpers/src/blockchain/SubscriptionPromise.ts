/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SubscriptionPromise } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

/**
 * Helps to build a promise associated to a subscription callback through which updates can be pushed to the promise.
 * This promise is resolved with the value of the latest update when a resolution criterion is met.
 * It is rejected with a custom error/reason if a rejection criterion is met or on timeout (optional). Rejection takes precedent.
 *
 * @param terminationOptions .
 * @param terminationOptions.resolveOn Resolution criterion. A function that evaluates an incoming update from the subscription.
 * If it returns a truthy value, the promise is resolved with the value of the latest update.
 * @param terminationOptions.rejectOn Rejection criterion. A function that evaluates an incoming update from the subscription.
 * If it returns a truthy value, this value is used as rejection reason.
 * @param terminationOptions.timeout Timeout in ms. If set, the promise will reject if not resolved before the time is up.
 * @returns An object containing both a subscription callback
 * and a promise which resolves or rejects depending on the values pushed to the callback.
 */
export function makeSubscriptionPromise<SubscriptionType>(
  terminationOptions: SubscriptionPromise.TerminationOptions<SubscriptionType>
): {
  promise: Promise<SubscriptionType>
  subscription: (value: SubscriptionType) => void
} {
  const { resolveOn, rejectOn, timeout = 0 } = { ...terminationOptions }
  let resolve: (value: SubscriptionType) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reject: (reason: any) => void
  const promise = new Promise<SubscriptionType>((res, rej) => {
    resolve = res
    reject = rej
  })
  const subscription: (value: SubscriptionType) => void =
    typeof rejectOn === 'function'
      ? (value) => {
          // eslint-disable-next-line no-extra-boolean-cast
          if (Boolean(rejectOn(value))) reject(value)
          if (resolveOn(value) === true) resolve(value)
        }
      : (value) => {
          if (resolveOn(value) === true) resolve(value)
        }
  if (timeout > 0)
    setTimeout(() => {
      reject(new SDKErrors.TimeoutError())
    }, timeout)
  return { promise, subscription }
}

/**
 * A wrapper around {@link makeSubscriptionPromise} that helps to build multiple promises which listen to the same subscription.
 *
 * @param args An array of objects each of which provides the arguments for creation of one promise.
 * @returns An object containing both a subscription callback
 * and an array of promises which resolve or reject depending on the values pushed to the callback.
 */
export function makeSubscriptionPromiseMulti<SubscriptionType>(
  args: Array<SubscriptionPromise.TerminationOptions<SubscriptionType>>
): {
  promises: Array<Promise<SubscriptionType>>
  subscription: (value: SubscriptionType) => void
} {
  const promises: Array<Promise<SubscriptionType>> = []
  const subscriptions: Array<(value: SubscriptionType) => void> = []
  args.forEach(
    (options: SubscriptionPromise.TerminationOptions<SubscriptionType>) => {
      const { promise, subscription: sub } = makeSubscriptionPromise(options)
      promises.push(promise)
      subscriptions.push(sub)
    }
  )

  function subscription(value: SubscriptionType): void {
    subscriptions.forEach((s) => s(value))
  }

  return { promises, subscription }
}

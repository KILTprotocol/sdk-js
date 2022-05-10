/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SubscriptionPromise } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

/**
 * Helps building a promise associated to a subscription callback through which updates can be pushed to the promise.
 * This promise is resolved with the value of latest update when a resolution criterion is met.
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
  const { resolveOn, rejectOn, timeout } = { ...terminationOptions }
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
          if (rejectOn(value)) reject(value)
          if (resolveOn(value)) resolve(value)
        }
      : (value) => {
          if (resolveOn(value)) resolve(value)
        }
  if (timeout)
    setTimeout(() => {
      reject(new SDKErrors.ERROR_TIMEOUT())
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
  args: Array<SubscriptionPromise.TerminationOptions<SubscriptionType>>
): {
  promises: Array<Promise<SubscriptionType>>
  subscription: (value: SubscriptionType) => void
} {
  const promises: Array<Promise<SubscriptionType>> = []
  const subscriptions: Array<(value: SubscriptionType) => void> = []
  args.forEach(
    (options: SubscriptionPromise.TerminationOptions<SubscriptionType>) => {
      const { promise, subscription } = makeSubscriptionPromise(options)
      promises.push(promise)
      subscriptions.push(subscription)
    }
  )
  const subscription = (value: SubscriptionType): void => {
    subscriptions.forEach((s) => s(value))
  }
  return { promises, subscription }
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ISubmittableResult } from './index.js'

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
 * Object to provide termination Criteria for the created Subscription Promise.
 */
export interface TerminationOptions<SubscriptionType> {
  resolveOn: Evaluator<SubscriptionType>
  rejectOn?: Evaluator<SubscriptionType>
  timeout?: number
}

export type ResultEvaluator = Evaluator<ISubmittableResult>
export type ErrorEvaluator = Evaluator<Error>
export type Options = TerminationOptions<ISubmittableResult>

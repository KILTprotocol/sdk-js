import type { ISubmittableResult } from '.'

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

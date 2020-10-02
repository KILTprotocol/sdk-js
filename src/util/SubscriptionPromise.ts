export interface Evaluator<I, O> {
  (value: I): [boolean, O]
}

export function makeSubscriptionPromise<SubscriptionType, PromiseType>(
  resolveOn: Array<Evaluator<SubscriptionType, PromiseType>>,
  rejectOn: Array<Evaluator<SubscriptionType, any>>
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
  return { promise, subscription }
}

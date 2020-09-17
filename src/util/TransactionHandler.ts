import { ISubmittableResult } from '@polkadot/types/types'
import { ErrorHandler } from '../errorhandling/ErrorHandler'

export type Subscription<T> = (update: T) => void
export type UnsubscribeHandle = () => void
export type SubscriptionHandle<T> = {
  subscriptions: Array<Subscription<T>>
  handle: Subscription<T>
}

export type EvaluatorCallback = (result: ISubmittableResult) => boolean

export default class TransactionSubscriptionHandler {
  private statusHistory: ISubmittableResult[] = []
  private readonly unsubscribe: UnsubscribeHandle
  private subscriptions: Array<Subscription<ISubmittableResult>>

  public static getSubscriptionHandle(): SubscriptionHandle<
    ISubmittableResult
  > {
    const subscriptions: Array<Subscription<ISubmittableResult>> = []
    const handle: Subscription<ISubmittableResult> = (result) => {
      console.log(`received status <${result?.status.type}>`)
      subscriptions.reverse().forEach((cb) => cb(result))
    }
    return { subscriptions, handle }
  }

  constructor(
    subscriptionHandle: SubscriptionHandle<ISubmittableResult>,
    unsubscribe: UnsubscribeHandle
  ) {
    this.subscriptions = subscriptionHandle.subscriptions as Array<
      Subscription<ISubmittableResult>
    >
    this.unsubscribe = unsubscribe

    this.subscribeDownstream((result) => {
      this.statusHistory.push(result)
      if (result.isFinalized || result.isError) {
        this.unsubscribe()
      }
    })
  }

  private async subscribeDownstream(
    subscription: Subscription<ISubmittableResult>
  ): Promise<void> {
    this.subscriptions.push(subscription)
  }

  private async makePromise(
    resolves: EvaluatorCallback,
    rejects: EvaluatorCallback = (r) => r.isError || r.isFinalized
  ): Promise<ISubmittableResult> {
    const resolvedBy = this.statusHistory.filter((historicStatus) =>
      resolves(historicStatus)
    )
    if (resolvedBy.length > 0)
      return Promise.resolve(resolvedBy[resolvedBy.length - 1])

    const rejectedBy = this.statusHistory.filter((historicStatus) =>
      rejects(historicStatus)
    )
    if (rejectedBy.length > 0)
      return Promise.reject(rejectedBy[rejectedBy.length - 1])

    return new Promise((resolve, reject) => {
      this.subscribeDownstream((result) => {
        if (resolves(result)) {
          resolve(result)
        } else if (rejects(result)) {
          reject(result)
        }
      })
    })
  }

  public get Finalized(): Promise<ISubmittableResult> {
    return this.makePromise((r) => r.isFinalized)
  }

  public get Ready(): Promise<ISubmittableResult> {
    return this.makePromise((r) => r.status.isReady)
  }

  public get inBlock(): Promise<ISubmittableResult> {
    return this.makePromise((r) => r.isInBlock)
  }

  public get Completed(): Promise<ISubmittableResult> {
    return this.makePromise((r) => r.isCompleted)
  }

  public get extrinsicsExecuted(): Promise<ISubmittableResult> {
    return this.makePromise(
      (r) => r.isInBlock && !ErrorHandler.extrinsicFailed(r),
      (r) => ErrorHandler.extrinsicFailed(r) || r.isError || r.isFinalized
    )
  }

  public get FinalizedWithExtrinsics(): Promise<ISubmittableResult> {
    return this.extrinsicsExecuted.then(() => this.Finalized)
  }

  public event(section: string, method: string): Promise<ISubmittableResult> {
    return this.makePromise((r) => !!r.findRecord(section, method))
  }

  public status(type: string): Promise<ISubmittableResult> {
    return this.makePromise((r) => r.status.type === type)
  }
}

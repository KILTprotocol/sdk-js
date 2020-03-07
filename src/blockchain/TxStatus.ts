import { ExtrinsicStatus } from '@polkadot/types/interfaces'

/**
 * @packageDocumentation
 * @module TxStatus
 */

export default class TxStatus {
  public payload: any
  readonly type: ExtrinsicStatus['type']
  readonly isFuture: boolean
  readonly isReady: boolean
  readonly isFinalized: boolean
  readonly isUsurped: boolean
  readonly isBroadcast: boolean
  readonly isDropped: boolean
  readonly isInvalid: boolean

  public constructor(status: ExtrinsicStatus, payload?: any) {
    this.payload = payload
    this.type = status.type
    this.isFuture = status.isFuture
    this.isReady = status.isReady
    this.isFinalized = status.isFinalized
    this.isUsurped = status.isUsurped
    this.isBroadcast = status.isBroadcast
    this.isDropped = status.isDropped
    this.isInvalid = status.isInvalid
  }

  get isCompleted(): boolean {
    return this.isError || this.isFinalized
  }

  get isError(): boolean {
    return this.isDropped || this.isInvalid || this.isUsurped
  }
}

/**
 * @packageDocumentation
 * @module TxStatus
 */
import { ExtrinsicStatus } from '@polkadot/types/interfaces'

export default class TxStatus implements Partial<ExtrinsicStatus> {
  public payload: string | object | undefined
  readonly type: ExtrinsicStatus['type']
  readonly isFuture: boolean
  readonly isReady: boolean
  readonly isFinalized: boolean
  readonly isUsurped: boolean
  readonly isBroadcast: boolean
  readonly isDropped: boolean
  readonly isInvalid: boolean

  public constructor(
    status: Partial<ExtrinsicStatus>,
    payload?: string | object
  ) {
    this.payload = payload
    this.type = status.type ? status.type : ''
    this.isFuture = !!status.isFuture
    this.isReady = !!status.isReady
    this.isFinalized = !!status.isFinalized
    this.isUsurped = !!status.isUsurped
    this.isBroadcast = !!status.isBroadcast
    this.isDropped = !!status.isDropped
    this.isInvalid = !!status.isInvalid
  }

  get isCompleted(): boolean {
    return this.isError || this.isFinalized
  }

  get isError(): boolean {
    return this.isDropped || this.isInvalid || this.isUsurped
  }
}

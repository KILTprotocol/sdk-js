/**
 * @packageDocumentation
 * @module AlternateTxStatus
 */
import { SubmittableResult } from '@polkadot/api'
import { ExtrinsicStatus } from '@polkadot/types/interfaces'

export default class TxStatus extends SubmittableResult {
  public payload: string | object | undefined

  public constructor(status: ExtrinsicStatus, payload?: string | object) {
    super({ status })
    this.payload = payload
  }

  get type(): ExtrinsicStatus['type'] {
    return this.status.type
  }

  get isFuture(): boolean {
    return this.status.isFuture
  }

  get isReady(): boolean {
    return this.status.isReady
  }

  get isUsurped(): boolean {
    return this.status.isUsurped
  }

  get isDropped(): boolean {
    return this.status.isDropped
  }

  get isInvalid(): boolean {
    return this.status.isInvalid
  }
}

/**
 * @packageDocumentation
 * @module TxStatus
 */

export default class TxStatus {
  public type: string
  public payload: any

  public constructor(type: string, payload?: any) {
    this.type = type
    this.payload = payload
  }
}

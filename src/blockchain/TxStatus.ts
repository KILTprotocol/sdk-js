/**
 * @packageDocumentation
 * @module TxStatus
 */

export default class TxStatus {
  public type: string
  public payload: string | object | undefined

  public constructor(type: string, payload?: string | object) {
    this.type = type
    this.payload = payload
  }
}

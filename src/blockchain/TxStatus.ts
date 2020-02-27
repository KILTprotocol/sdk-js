/**
 * @packageDocumentation
 * @module TxStatus
 */

export default class TxStatus {
  public type: string
  public payload: object | undefined

  public constructor(type: string, payload?: object) {
    this.type = type
    this.payload = payload
  }
}

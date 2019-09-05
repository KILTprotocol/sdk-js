/**
 * @module Blockchain
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
export default class TxStatus {
  public type: string
  public payload: any

  public constructor(type: string, payload?: any) {
    this.type = type
    this.payload = payload
  }
}

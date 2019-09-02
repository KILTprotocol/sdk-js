/**
 * @module Blockchain
 */

/**
 * Dummy comment, so that typedoc ignores this file
 */
export default class TxStatus {
  public type: string | undefined
  public payload: any

  public constructor(type: string | undefined, payload?: any) {
    this.type = type
    this.payload = payload
  }
}

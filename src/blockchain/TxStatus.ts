/**
 * @module Blockchain
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */

import { Codec } from '@polkadot/types/types'
import ICType from '../types/CType'

export type QueryResult = Codec | undefined | null | ICType | string

export default class TxStatus {
  public type: string
  public payload: QueryResult

  public constructor(type: string, payload?: QueryResult) {
    this.type = type
    this.payload = payload
  }
}

import { v4 as uuid } from 'uuid'
import { Hash } from '@polkadot/types'

export class UUID {
  /**
   * Generates a H256 compliant UUID.
   */
  public static generate(): string {
    return new Hash(uuid()).toString()
  }
}

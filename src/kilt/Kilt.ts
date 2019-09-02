/**
 * #### Overview
 * Minimalistic module dedicated to connecting to the blockchain.
 * #### Usage
 * ```Kilt.connect('ws://localhost:9944')```
 * @module Kilt
 */

/**
 * Dummy comment, so that typedoc ignores this file
 */
import { getCached } from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'

export function connect(host: string): Promise<IBlockchainApi> {
  return getCached(host)
}

export default {
  connect,
}

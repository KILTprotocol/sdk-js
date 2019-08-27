/**
 * @module Kilt
 * --- Overview ---
 * Minimalistic module dedicated to connecting to the blockchain.
 * --- Usage ---
 * ```Kilt.connect('ws://localhost:9944')```
 */
import { getCached } from '../blockchainApiConnection'

export function connect(host: string) {
  return getCached(host)
}

export default {
  connect,
}

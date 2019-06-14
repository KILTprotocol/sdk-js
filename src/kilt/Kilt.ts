/**
 * @module Kilt
 */
import { getCached } from '../blockchainApiConnection'

export function connect(host: string) {
  return getCached(host)
}

export default {
  connect,
}

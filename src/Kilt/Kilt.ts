import { getCached } from '../blockchainApiConnection'

export function connect() {
  return getCached()
}

export default {
  connect,
}

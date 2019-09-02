/**
 * @module BlockchainApiConnection
 */

/**
 * Dummy comment, so that typedoc ignores this file
 */
import Blockchain from '../../blockchain/Blockchain'

jest.mock('../../blockchain/Blockchain')

export async function getCached() {
  return Promise.resolve(Blockchain)
}

export default getCached

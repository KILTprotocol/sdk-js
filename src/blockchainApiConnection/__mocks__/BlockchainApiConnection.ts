/**
 * @module BlockchainApiConnection
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import Blockchain from '../../blockchain/Blockchain'

jest.mock('../../blockchain/Blockchain')

export async function getCached() {
  return Promise.resolve(Blockchain)
}

export default getCached

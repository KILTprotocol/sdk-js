/**
 * @group integration/did
 */

import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did } from '..'
import { WS_HOST, NewIdentity } from './utils'
import getCached from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'

const ident = NewIdentity()

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(WS_HOST)
})

describe('querying DIDs that do not exist', () => {
  it('queryByAddress', async () => {
    return expect(queryByAddress(ident.address)).resolves.toBeNull()
  })

  it('queryByIdentifier', async () => {
    return expect(
      queryByIdentifier(Did.fromIdentity(ident).identifier)
    ).resolves.toBeNull()
  })
})

afterAll(() => {
  blockchain.api.disconnect()
})

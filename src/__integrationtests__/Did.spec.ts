/**
 * @group integration/did
 * @ignore
 * @packageDocumentation
 */

import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did, Identity } from '..'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

describe('querying DIDs that do not exist', () => {
  let ident: Identity

  beforeAll(async () => {
    ident = await Identity.buildFromMnemonic()
  })

  it('queryByAddress', async () => {
    return expect(queryByAddress(ident.getAddress())).resolves.toBeNull()
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

/**
 * @packageDocumentation
 * @group integration/did
 * @ignore
 */

import { Did, Identity } from '..'
import { IBlockchainApi } from '../blockchain/Blockchain'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import { queryByAddress, queryByIdentifier } from '../did/Did.chain'

let blockchain: IBlockchainApi | undefined
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
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})

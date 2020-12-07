/**
 * @packageDocumentation
 * @group integration/did
 * @ignore
 */

import { Did, Identity } from '..'
import { IBlockchainApi } from '../blockchain/Blockchain'
import getCached from '../blockchainApiConnection'
import { configuration } from '../config/ConfigService'
import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { WS_ADDRESS } from './utils'

let blockchain: IBlockchainApi | undefined
beforeAll(async () => {
  blockchain = await getCached((configuration.host = WS_ADDRESS))
})

describe('querying DIDs that do not exist', () => {
  let ident: Identity

  beforeAll(async () => {
    ident = Identity.buildFromMnemonic(Identity.generateMnemonic())
  })

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
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})

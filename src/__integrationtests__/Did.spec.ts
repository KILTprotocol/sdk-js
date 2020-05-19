/**
 * @group integration/did
 * @ignore
 * @packageDocumentation
 */

import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did, Identity } from '..'
import getCached from '../blockchainApiConnection'

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

afterAll(async () => {
  await getCached().then(bc => bc.api.disconnect())
})

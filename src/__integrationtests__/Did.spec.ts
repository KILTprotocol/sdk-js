/**
 * @group integration/did
 * @ignore
 * @packageDocumentation
 */

import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did } from '..'
import { NewIdentity } from './utils'
import getCached from '../blockchainApiConnection'

const ident = NewIdentity()

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

afterAll(async () => {
  await getCached().then(bc => bc.api.disconnect())
})

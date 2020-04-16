/**
 * @group integration/did
 */

import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did } from '..'
import { NewIdentity } from './utils'
import getCached from '../blockchainApiConnection'

describe('querying DIDs that do not exist', () => {
  it('queryByAddress', async () => {
    const ident = await NewIdentity()
    return expect(queryByAddress(ident.getAddress())).resolves.toBeNull()
  })

  it('queryByIdentifier', async () => {
    const ident = await NewIdentity()
    return expect(
      queryByIdentifier(Did.fromIdentity(ident).identifier)
    ).resolves.toBeNull()
  })
})

afterAll(() => {
  return getCached().then((bc) => bc.api.disconnect())
})

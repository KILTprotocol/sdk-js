import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did } from '..'
import { NewIdentity } from './utils'
import getCached from '../blockchainApiConnection'

const ident = NewIdentity()

xdescribe('querying DIDs that do not exist', () => {
  test('queryByAddress', async () => {
    return expect(queryByAddress(ident.address)).resolves.toBeNull()
  })

  test('queryByIdentifier', async () => {
    return expect(
      queryByIdentifier(Did.fromIdentity(ident).identifier)
    ).resolves.toBeNull()
  })
})

afterAll(async () => {
  getCached().then(bc => {
    bc.api.disconnect()
  })
})

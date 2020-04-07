/**
 * @group integration/did
 */

import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { Did } from '..'
import { NewIdentity } from './utils'

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

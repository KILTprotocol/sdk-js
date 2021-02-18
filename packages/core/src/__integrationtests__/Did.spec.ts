/**
 * @packageDocumentation
 * @group integration/did
 * @ignore
 */

import { Did, Identity } from '..'
import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { WS_ADDRESS } from './utils'
import { config, disconnect } from '../kilt'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
})

describe('querying DIDs that do not exist', () => {
  let ident: Identity

  beforeAll(async () => {
    ident = Identity.buildFromMnemonic(Identity.generateMnemonic(), 'ed25519')
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
  disconnect()
})

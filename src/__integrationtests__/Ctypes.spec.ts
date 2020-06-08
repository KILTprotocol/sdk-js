/**
 * @group integration/ctype
 * @ignore
 * @packageDocumentation
 */

import { wannabeFaucet } from './utils'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { getOwner } from '../ctype/CType.chain'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import { Identity } from '..'
import { IBlockchainApi } from '../blockchain/Blockchain'

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: Identity
  let ctypeCounter = 0

  function makeCType(): CType {
    ctypeCounter += 1
    return CType.fromCType({
      schema: {
        $id: `kilt:ctype:0x${ctypeCounter}`,
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'ctype10',
        properties: {
          name: { type: 'string' },
        },
        type: 'object',
      } as ICType['schema'],
    } as ICType)
  }

  beforeAll(async () => {
    ctypeCreator = await wannabeFaucet
  })

  it('should not be possible to create a claim type w/o tokens', async () => {
    const ctype = makeCType()
    const bobbyBroke = await Identity.buildFromMnemonic()
    await expect(ctype.store(bobbyBroke)).rejects.toThrowError()
    await expect(ctype.verifyStored()).resolves.toBeFalsy()
  }, 20000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    await ctype.store(ctypeCreator)
    await Promise.all([
      expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.getAddress()),
      expect(ctype.verifyStored()).resolves.toBeTruthy(),
    ])
    ctype.owner = ctypeCreator.getAddress()
    await expect(ctype.verifyStored()).resolves.toBeTruthy()
  }, 20000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    await ctype.store(ctypeCreator)
    await expect(ctype.store(ctypeCreator)).rejects.toThrowError(
      'CTYPE already exists'
    )
    // console.log('Triggered error on re-submit')
    await expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.getAddress())
  }, 30000)

  it('should tell when a ctype is not on chain', async () => {
    const iAmNotThere = CType.fromCType({
      schema: {
        $id: 'kilt:ctype:0x2',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'ctype2',
        properties: {
          game: { type: 'string' },
        },
        type: 'object',
      } as ICType['schema'],
    } as ICType)

    const iAmNotThereWithOwner = CType.fromCType({
      schema: {
        $id: 'kilt:ctype:0x2',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'ctype2',
        properties: {
          game: { type: 'string' },
        },
        type: 'object',
      } as ICType['schema'],
      owner: ctypeCreator.getAddress(),
    } as ICType)

    await Promise.all([
      expect(iAmNotThere.verifyStored()).resolves.toBeFalsy(),
      expect(getOwner(iAmNotThere.hash)).resolves.toBeNull(),
      expect(getOwner('0x012012012')).resolves.toBeNull(),
      expect(iAmNotThereWithOwner.verifyStored()).resolves.toBeFalsy(),
    ])
  })
})

afterAll(() => {
  blockchain.api.disconnect()
})

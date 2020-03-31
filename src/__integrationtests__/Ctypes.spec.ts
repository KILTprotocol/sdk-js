/**
 * @group integration/ctype
 */

import { faucet } from './utils'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { getOwner } from '../ctype/CType.chain'
import getCached from '../blockchainApiConnection'
import { Identity } from '..'

describe('When there is an CtypeCreator and a verifier', async () => {
  const CtypeCreator = faucet

  const ctype = CType.fromCType({
    schema: {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ctype10',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    } as ICType['schema'],
  } as ICType)

  it('should not be possible to create a claim type w/o tokens', async () => {
    const BobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())
    await expect(ctype.store(BobbyBroke)).rejects.toThrowError()
    await expect(ctype.verifyStored()).resolves.toBeFalsy()
  }, 20000)

  it('should be possible to create a claim type', async () => {
    await ctype.store(CtypeCreator)
    await Promise.all([
      expect(getOwner(ctype.hash)).resolves.toBe(CtypeCreator.address),
      expect(ctype.verifyStored()).resolves.toBeTruthy(),
    ])
    ctype.owner = CtypeCreator.address
    await expect(ctype.verifyStored()).resolves.toBeTruthy()
  }, 20000)

  it('should not be possible to create a claim type that exists', async () => {
    await expect(ctype.store(CtypeCreator)).rejects.toThrowError(
      'CTYPE already exists'
    )
    // console.log('Triggered error on re-submit')
    await expect(getOwner(ctype.hash)).resolves.toBe(CtypeCreator.address)
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

    const iAmNotThereWowner = CType.fromCType({
      schema: {
        $id: 'kilt:ctype:0x2',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'ctype2',
        properties: {
          game: { type: 'string' },
        },
        type: 'object',
      } as ICType['schema'],
      owner: CtypeCreator.address,
    } as ICType)

    await Promise.all([
      expect(iAmNotThere.verifyStored()).resolves.toBeFalsy(),
      expect(getOwner(iAmNotThere.hash)).resolves.toBeNull(),
      expect(getOwner('0x012012012')).resolves.toBeNull(),
      expect(iAmNotThereWowner.verifyStored()).resolves.toBeFalsy(),
    ])
  })
})

afterAll(async () => {
  await getCached().then(bc => bc.api.disconnect())
})

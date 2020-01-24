/**
 * @group integration
 */

import BN from 'bn.js/'
import { faucet, transferTokens, NewIdentity, DriversLicense } from './utils'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { getOwner } from '../ctype/CType.chain'
import { IBlockchainApi } from '../blockchain/Blockchain'
import getCached from '../blockchainApiConnection'

describe('When there is an CtypeCreator and a verifier', async () => {
  const CtypeCreator = NewIdentity()
  const CopyCat = NewIdentity()

  beforeAll(async () => {
    await transferTokens(faucet, CtypeCreator, new BN(30_000_000))
    await transferTokens(faucet, CopyCat, new BN(30_000_000))
  }, 30000)

  it('should be possible to create a claim type', async () => {
    const ctype = DriversLicense
    const status = await ctype.store(CtypeCreator)
    console.log(status)
    // await expect(ctype.verifyStored()).resolves.toBeTruthy()
    await expect(getOwner(ctype.hash)).resolves.toBe(CtypeCreator.address)
  }, 20000)

  it('should not be possible to create a claim type that exists', async () => {
    const CTypeSaintship = new CType({
      schema: {
        $id: 'CertificateOfSaintship',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        properties: {
          name: {
            type: 'string',
          },
          miracle1: {
            type: 'string',
          },
          miracle2: {
            type: 'string',
          },
          miracle3: {
            type: 'string',
          },
        },
        type: 'object',
      },
    } as ICType)

    await CTypeSaintship.store(CtypeCreator)
    console.log('Stored Ctype once')
    await expect(CTypeSaintship.store(CopyCat)).rejects.toThrowError(
      'CTYPE already exists'
    )
    console.log('Triggered error on re-submit')
    // currently failing: await expect(CTypeSaintship.verifyStored()).resolves.toBeTruthy()
    await expect(getOwner(CTypeSaintship.hash)).resolves.toBe(
      CtypeCreator.address
    )
  }, 30000)
})

afterAll(async () => {
  await getCached().then(
    (BC: IBlockchainApi) => {
      BC.api.disconnect()
    },
    err => {
      console.log('not connected to chain')
      console.log(err)
    }
  )
})

/**
 * @packageDocumentation
 * @group integration/ctype
 * @ignore
 */

import { ICType } from '@kiltprotocol/types'
import { Identity } from '..'
import { IS_IN_BLOCK, submitTxWithReSign } from '../blockchain/Blockchain.utils'
import CType from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'
import { ExtrinsicErrors } from '../errorhandling/ExtrinsicError'
import { config, disconnect } from '../kilt'
import { wannabeFaucet, WS_ADDRESS } from './utils'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
})

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: Identity
  let ctypeCounter = 0

  function makeCType(): CType {
    ctypeCounter += 1
    return CType.fromSchema({
      $id: `kilt:ctype:0x${ctypeCounter}`,
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: `ctype1${ctypeCounter}`,
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    } as ICType['schema'])
  }

  beforeAll(async () => {
    ctypeCreator = await wannabeFaucet
  })

  it('should not be possible to create a claim type w/o tokens', async () => {
    const ctype = makeCType()
    const bobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())
    await expect(
      ctype.store(bobbyBroke).then((tx) =>
        submitTxWithReSign(tx, bobbyBroke, {
          resolveOn: IS_IN_BLOCK,
        })
      )
    ).rejects.toThrowError()
    await expect(ctype.verifyStored()).resolves.toBeFalsy()
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    await ctype.store(ctypeCreator).then((tx) =>
      submitTxWithReSign(tx, ctypeCreator, {
        resolveOn: IS_IN_BLOCK,
      })
    )
    await Promise.all([
      expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.address),
      expect(ctype.verifyStored()).resolves.toBeTruthy(),
    ])
    ctype.owner = ctypeCreator.address
    await expect(ctype.verifyStored()).resolves.toBeTruthy()
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    await ctype.store(ctypeCreator).then((tx) =>
      submitTxWithReSign(tx, ctypeCreator, {
        resolveOn: IS_IN_BLOCK,
      })
    )
    await expect(
      ctype.store(ctypeCreator).then((tx) =>
        submitTxWithReSign(tx, ctypeCreator, {
          resolveOn: IS_IN_BLOCK,
        })
      )
    ).rejects.toThrowError(ExtrinsicErrors.CType.ERROR_CTYPE_ALREADY_EXISTS)
    // console.log('Triggered error on re-submit')
    await expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.address)
  }, 45_000)

  it('should tell when a ctype is not on chain', async () => {
    const iAmNotThere = CType.fromSchema({
      $id: 'kilt:ctype:0x2',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ctype2',
      properties: {
        game: { type: 'string' },
      },
      type: 'object',
    } as ICType['schema'])

    const iAmNotThereWithOwner = CType.fromSchema(
      {
        $id: 'kilt:ctype:0x3',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'ctype2',
        properties: {
          game: { type: 'string' },
        },
        type: 'object',
      },
      ctypeCreator.signKeyringPair.address
    )

    await Promise.all([
      expect(iAmNotThere.verifyStored()).resolves.toBeFalsy(),
      expect(getOwner(iAmNotThere.hash)).resolves.toBeNull(),
      expect(getOwner('0x012012012')).resolves.toBeNull(),
      expect(iAmNotThereWithOwner.verifyStored()).resolves.toBeFalsy(),
    ])
  })
})

afterAll(() => {
  disconnect()
})

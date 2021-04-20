/**
 * @group integration/ctype
 */

import type { ICType } from '@kiltprotocol/types'
import {
  Blockchain,
  BlockchainUtils,
  ExtrinsicErrors,
} from '@kiltprotocol/chain-helpers'
import { Identity } from '..'
import CType from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'
import { config, disconnect } from '../kilt'
import { wannabeFaucet, WS_ADDRESS } from './utils'

import '../../../../testingTools/jestErrorCodeMatcher'

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
    ctypeCreator = wannabeFaucet
  })

  it('should not be possible to create a claim type w/o tokens', async () => {
    const ctype = makeCType()
    const bobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())
    await expect(
      ctype.store().then((tx) =>
        Blockchain.signAndSubmitTx(tx, bobbyBroke, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).rejects.toThrowError()
    await expect(ctype.verifyStored()).resolves.toBeFalsy()
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    await ctype.store().then((tx) =>
      Blockchain.signAndSubmitTx(tx, ctypeCreator, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
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
    await ctype.store().then((tx) =>
      Blockchain.signAndSubmitTx(tx, ctypeCreator, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
    await expect(
      ctype.store().then((tx) =>
        Blockchain.signAndSubmitTx(tx, ctypeCreator, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).rejects.toThrowErrorWithCode(
      ExtrinsicErrors.CType.ERROR_CTYPE_ALREADY_EXISTS.code
    )
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

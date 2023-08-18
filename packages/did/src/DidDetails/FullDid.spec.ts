/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'
import { randomAsHex } from '@polkadot/util-crypto'

import { ConfigService } from '@kiltprotocol/config'
import type {
  DidDocument,
  KiltKeyringPair,
  SignCallback,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '../../../../tests/testUtils'
import { generateDidAuthenticatedTx } from '../Did.chain.js'
import * as Did from './index.js'

const augmentedApi = ApiMocks.createAugmentedApi()
const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

jest.mock('../Did.chain')
jest
  .mocked(generateDidAuthenticatedTx)
  .mockResolvedValue({} as SubmittableExtrinsic)

/*
 * Functions tested in integration tests:
 * - getKeysForExtrinsic
 * - authorizeExtrinsic
 */

describe('When creating an instance from the chain', () => {
  describe('authorizeBatch', () => {
    let keypair: KiltKeyringPair
    let sign: SignCallback
    let fullDidDocument: DidDocument

    beforeAll(async () => {
      const keyTool = makeSigningKeyTool()
      keypair = keyTool.keypair
      fullDidDocument = await createLocalDemoFullDidFromKeypair(keyTool.keypair)
      sign = keyTool.getSignCallback(fullDidDocument)
    })

    describe('.addSingleTx()', () => {
      it('fails if the extrinsic does not require a DID', async () => {
        const extrinsic = augmentedApi.tx.indices.claim(1)
        await expect(async () =>
          Did.authorizeBatch({
            did: fullDidDocument.id,
            batchFunction: augmentedApi.tx.utility.batchAll,
            extrinsics: [extrinsic, extrinsic],
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBatchError: Can only batch extrinsics that require a DID signature]'
        )
      })

      it('fails if the extrinsic is a utility (batch) extrinsic containing valid extrinsics', async () => {
        const extrinsic = augmentedApi.tx.utility.batch([
          await augmentedApi.tx.ctype.add('test-ctype'),
        ])
        const batchFunction =
          jest.fn() as unknown as typeof mockedApi.tx.utility.batchAll
        await Did.authorizeBatch({
          did: fullDidDocument.id,
          batchFunction,
          extrinsics: [extrinsic, extrinsic],
          sign,
          submitter: keypair.address,
        })

        expect(batchFunction).toHaveBeenCalledWith([extrinsic, extrinsic])
      })

      it('adds different batches requiring different keys', async () => {
        const ctype1Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))
        const ctype2Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))
        const delegationExtrinsic1 =
          await augmentedApi.tx.delegation.createHierarchy(
            randomAsHex(32),
            randomAsHex(32)
          )
        const delegationExtrinsic2 =
          await augmentedApi.tx.delegation.createHierarchy(
            randomAsHex(32),
            randomAsHex(32)
          )
        const ctype3Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))
        const ctype4Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))

        const batchFunction =
          jest.fn() as unknown as typeof augmentedApi.tx.utility.batchAll
        const extrinsics = [
          ctype1Extrinsic,
          ctype2Extrinsic,
          delegationExtrinsic1,
          delegationExtrinsic2,
          ctype3Extrinsic,
          ctype4Extrinsic,
        ]
        await Did.authorizeBatch({
          did: fullDidDocument.id,
          batchFunction,
          extrinsics,
          nonce: new BN(0),
          sign,
          submitter: keypair.address,
        })

        expect(batchFunction).toHaveBeenCalledWith([
          ctype1Extrinsic,
          ctype2Extrinsic,
        ])
        expect(batchFunction).toHaveBeenCalledWith([
          delegationExtrinsic1,
          delegationExtrinsic2,
        ])
        expect(batchFunction).toHaveBeenCalledWith([
          ctype3Extrinsic,
          ctype4Extrinsic,
        ])
      })
    })

    // TODO: complete these tests once SDK has been refactored to work with generic api object
    describe('.build()', () => {
      it('throws if batch is empty', async () => {
        await expect(async () =>
          Did.authorizeBatch({
            did: fullDidDocument.id,
            batchFunction: augmentedApi.tx.utility.batchAll,
            extrinsics: [],
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBatchError: Cannot build a batch with no transactions]'
        )
      })
      it.todo('successfully create a batch with only 1 extrinsic')
      it.todo('successfully create a batch with 1 extrinsic per required key')
      it.todo('successfully create a batch with 2 extrinsics per required key')
      it.todo(
        'successfully create a batch with 1 extrinsic per required key, repeated two times'
      )
    })
  })
})

const mockApi = ApiMocks.createAugmentedApi()

describe('When creating an instance from the chain', () => {
  it('Should return correct KeyRelationship for single valid call', () => {
    const keyRelationship = Did.getKeyRelationshipForTx(
      mockApi.tx.attestation.add(new Uint8Array(32), new Uint8Array(32), null)
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return correct KeyRelationship for batched call', () => {
    const keyRelationship = Did.getKeyRelationshipForTx(
      mockApi.tx.utility.batch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
      ])
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return correct KeyRelationship for batchAll call', () => {
    const keyRelationship = Did.getKeyRelationshipForTx(
      mockApi.tx.utility.batchAll([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
      ])
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return correct KeyRelationship for forceBatch call', () => {
    const keyRelationship = Did.getKeyRelationshipForTx(
      mockApi.tx.utility.forceBatch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
      ])
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return undefined for batch with mixed KeyRelationship calls', () => {
    const keyRelationship = Did.getKeyRelationshipForTx(
      mockApi.tx.utility.forceBatch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.web3Names.claim('awesomename'),
      ])
    )
    expect(keyRelationship).toBeUndefined()
  })
})

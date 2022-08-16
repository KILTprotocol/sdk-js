/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/didbuilder
 */

import { randomAsHex } from '@polkadot/util-crypto'

import { BN } from '@polkadot/util'
import { KeyringPair, SignCallback } from '@kiltprotocol/types'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { didAuthorizeExtrinsics } from './didAuthorizeExtrinsics.js'
import { FullDidDetails } from '../DidDetails'

const mockApi = ApiMocks.createAugmentedApi()

jest.mock('../Did.chain.js', () => ({
  ...jest.requireActual('../Did.chain.js'),
  generateDidAuthenticatedTx: jest.fn().mockResolvedValue({}),
}))

describe('didAuthorizeExtrinsics', () => {
  let keypair: KeyringPair
  let sign: SignCallback
  let fullDid: FullDidDetails

  beforeAll(async () => {
    ;({ keypair, sign } = makeSigningKeyTool())
    fullDid = await createLocalDemoFullDidFromKeypair(keypair)
  })

  describe('.addSingleExtrinsic()', () => {
    it('fails if the extrinsic does not require a DID', async () => {
      const extrinsic = mockApi.tx.indices.claim(1)
      await expect(async () =>
        didAuthorizeExtrinsics({
          did: fullDid,
          batchFunction: mockApi.tx.utility.batchAll,
          extrinsics: [extrinsic, extrinsic],
          sign,
          submitter: keypair.address,
        })
      ).rejects.toMatchInlineSnapshot(
        '[DidBuilderError: Can only batch extrinsics that require a DID signature]'
      )
    })

    it('fails if the extrinsic is a utility (batch) extrinsic containing valid extrinsics', async () => {
      const extrinsic = mockApi.tx.utility.batch([
        await mockApi.tx.ctype.add('test-ctype'),
      ])
      await expect(async () =>
        didAuthorizeExtrinsics({
          did: fullDid,
          batchFunction: mockApi.tx.utility.batchAll,
          extrinsics: [extrinsic, extrinsic],
          sign,
          submitter: keypair.address,
        })
      ).rejects.toMatchInlineSnapshot(
        '[DidBuilderError: Can only batch extrinsics that require a DID signature]'
      )
    })

    it('fails if the DID does not have any key required to sign the batch', async () => {
      // Full DID with only an authentication key.
      const newFullDid = new FullDidDetails({
        uri: fullDid.uri,
        identifier: fullDid.identifier,
        keys: { [fullDid.authenticationKey.id]: fullDid.authenticationKey },
        keyRelationships: {
          authentication: new Set([fullDid.authenticationKey.id]),
        },
      })
      const extrinsic = await mockApi.tx.ctype.add('test-ctype')

      await expect(async () =>
        didAuthorizeExtrinsics({
          did: newFullDid,
          batchFunction: mockApi.tx.utility.batchAll,
          extrinsics: [extrinsic, extrinsic],
          nonce: new BN(0),
          sign,
          submitter: keypair.address,
        })
      ).rejects.toMatchInlineSnapshot(
        '[DidBuilderError: Found no key for relationship "assertionMethod"]'
      )
    })

    it('adds different batches requiring different keys', async () => {
      const ctype1Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
      const ctype2Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
      const delegationExtrinsic1 = await mockApi.tx.delegation.createHierarchy(
        randomAsHex(32),
        randomAsHex(32)
      )
      const delegationExtrinsic2 = await mockApi.tx.delegation.createHierarchy(
        randomAsHex(32),
        randomAsHex(32)
      )
      const ctype3Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
      const ctype4Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))

      const batchFunction =
        jest.fn() as unknown as typeof mockApi.tx.utility.batchAll
      const extrinsics = [
        ctype1Extrinsic,
        ctype2Extrinsic,
        delegationExtrinsic1,
        delegationExtrinsic2,
        ctype3Extrinsic,
        ctype4Extrinsic,
      ]
      await didAuthorizeExtrinsics({
        did: fullDid,
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
        didAuthorizeExtrinsics({
          did: fullDid,
          batchFunction: mockApi.tx.utility.batchAll,
          extrinsics: [],
          sign,
          submitter: keypair.address,
        })
      ).rejects.toMatchInlineSnapshot(
        '[DidBuilderError: Cannot build a batch with no transactions]'
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

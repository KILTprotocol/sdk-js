/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
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
  SignerInterface,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '../../../../tests/testUtils'
import { generateDidAuthenticatedTx } from '../Did.chain.js'
import {
  authorizeBatch,
  getVerificationRelationshipForTx,
} from './FullDidDetails.js'

const augmentedApi = ApiMocks.createAugmentedApi()
const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

jest.mock('../DidResolver/DidResolver', () => {
  return {
    ...jest.requireActual('../DidResolver/DidResolver'),
    resolve: jest.fn(),
    dereference: jest.fn(),
    resolveRepresentation: jest.fn(),
  }
})
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
    let signers: SignerInterface[]
    let fullDid: DidDocument

    beforeAll(async () => {
      const keyTool = await makeSigningKeyTool()
      keypair = keyTool.keypair
      fullDid = await createLocalDemoFullDidFromKeypair(keyTool.keypair)
      signers = await keyTool.getSigners(fullDid)
    })

    describe('.addSingleTx()', () => {
      it('fails if the extrinsic does not require a DID', async () => {
        const extrinsic = augmentedApi.tx.indices.claim(1)
        await expect(async () =>
          authorizeBatch({
            did: fullDid,
            batchFunction: augmentedApi.tx.utility.batchAll,
            extrinsics: [extrinsic, extrinsic],
            signers,
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
        await authorizeBatch({
          did: fullDid,
          batchFunction,
          extrinsics: [extrinsic, extrinsic],
          signers,
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
        await authorizeBatch({
          did: fullDid,
          batchFunction,
          extrinsics,
          nonce: new BN(0),
          signers,
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
          authorizeBatch({
            did: fullDid,
            batchFunction: augmentedApi.tx.utility.batchAll,
            extrinsics: [],
            signers,
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
  it('Should return correct VerificationRelationship for single valid call', () => {
    const verificationRelationship = getVerificationRelationshipForTx(
      mockApi.tx.attestation.add(new Uint8Array(32), new Uint8Array(32), null)
    )
    expect(verificationRelationship).toBe('assertionMethod')
  })
  it('Should return correct VerificationRelationship for batched call', () => {
    const verificationRelationship = getVerificationRelationshipForTx(
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
    expect(verificationRelationship).toBe('assertionMethod')
  })
  it('Should return correct VerificationRelationship for batchAll call', () => {
    const verificationRelationship = getVerificationRelationshipForTx(
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
    expect(verificationRelationship).toBe('assertionMethod')
  })
  it('Should return correct VerificationRelationship for forceBatch call', () => {
    const verificationRelationship = getVerificationRelationshipForTx(
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
    expect(verificationRelationship).toBe('assertionMethod')
  })
  it('Should return undefined for batch with mixed VerificationRelationship calls', () => {
    const verificationRelationship = getVerificationRelationshipForTx(
      mockApi.tx.utility.forceBatch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.web3Names.claim('awesomename'),
      ])
    )
    expect(verificationRelationship).toBeUndefined()
  })
})

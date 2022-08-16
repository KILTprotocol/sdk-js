/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/didbuilder
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { randomAsHex } from '@polkadot/util-crypto'

import {
  KeyRelationship,
  KeyringPair,
  NewDidVerificationKey,
  SignCallback,
} from '@kiltprotocol/types'
import {
  createLocalDemoFullDidFromKeypair,
  ApiMocks,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { encodePublicKey, getSetKeyExtrinsic } from '../Did.chain.js'
import { DidBatchBuilder } from './DidBatchBuilder'
import { FullDidDetails } from '../DidDetails'

const mockApi = ApiMocks.createAugmentedApi()

// Copied from the chain file
jest.mock('../Did.chain.js', () => ({
  ...jest.requireActual('../Did.chain.js'),
  getSetKeyExtrinsic: jest.fn(
    async (
      keyRelationship: KeyRelationship,
      key: NewDidVerificationKey
    ): Promise<Extrinsic> => {
      const keyAsEnum = encodePublicKey(key)
      switch (keyRelationship) {
        case 'capabilityDelegation':
          return mockApi.tx.did.setDelegationKey(keyAsEnum)
        case 'assertionMethod':
          return mockApi.tx.did.setAttestationKey(keyAsEnum)
        default:
          return mockApi.tx.did.setAuthenticationKey(keyAsEnum)
      }
    }
  ),
}))

describe('DidBatchBuilder', () => {
  let keypair: KeyringPair
  let sign: SignCallback
  let fullDid: FullDidDetails

  beforeAll(async () => {
    ;({ keypair, sign } = makeSigningKeyTool())
    fullDid = await createLocalDemoFullDidFromKeypair(keypair)
  })

  describe('.addSingleExtrinsic()', () => {
    it('fails if the extrinsic is a DID extrinsic', async () => {
      const builder = new DidBatchBuilder(mockApi, fullDid)
      const ext = await getSetKeyExtrinsic('assertionMethod', {
        publicKey: Uint8Array.from(new Array(32).fill(1)),
        type: 'ed25519',
      })
      expect(() => builder.addSingleExtrinsic(ext)).toThrow()
    })
    it('fails if the extrinsic does not require a DID', async () => {
      const builder = new DidBatchBuilder(mockApi, fullDid)
      const ext = mockApi.tx.indices.claim(1)
      expect(() => builder.addSingleExtrinsic(ext)).toThrow()
    })
    it('fails if the extrinsic is a utility (batch) extrinsic containing valid extrinsics', async () => {
      const builder = new DidBatchBuilder(mockApi, fullDid)
      const ext = mockApi.tx.utility.batch([
        await mockApi.tx.ctype.add('test-ctype'),
      ])
      expect(() => builder.addSingleExtrinsic(ext)).toThrow()
    })
    it('fails if the DID does not any key required to sign the batch', async () => {
      // Full DID with only an authentication key.
      const newFullDid = new FullDidDetails({
        uri: fullDid.uri,
        identifier: fullDid.identifier,
        keys: { [fullDid.authenticationKey.id]: fullDid.authenticationKey },
        keyRelationships: {
          authentication: new Set([fullDid.authenticationKey.id]),
        },
      })
      const builder = new DidBatchBuilder(mockApi, newFullDid)
      const ext = mockApi.tx.utility.batch([
        await mockApi.tx.ctype.add('test-ctype'),
      ])
      expect(() => builder.addSingleExtrinsic(ext)).toThrow()
    })
    it('adds different batches requiring different keys', async () => {
      const ctype1Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
      const ctype2Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
      const delegationExtrinsic = await mockApi.tx.delegation.createHierarchy(
        randomAsHex(32),
        randomAsHex(32)
      )
      const ctype3Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))

      const builder = new DidBatchBuilder(mockApi, fullDid)
        .addSingleExtrinsic(ctype1Extrinsic)
        .addSingleExtrinsic(ctype2Extrinsic)
        .addSingleExtrinsic(delegationExtrinsic)
        .addSingleExtrinsic(ctype3Extrinsic)

      expect(
        // @ts-ignore
        builder.batches
      ).toStrictEqual([
        {
          keyRelationship: 'assertionMethod',
          extrinsics: [ctype1Extrinsic, ctype2Extrinsic],
        },
        {
          keyRelationship: 'capabilityDelegation',
          extrinsics: [delegationExtrinsic],
        },
        {
          keyRelationship: 'assertionMethod',
          extrinsics: [ctype3Extrinsic],
        },
      ])
    })
  })

  // TODO: complete these tests once SDK has been refactored to work with generic api object
  describe('.build()', () => {
    it('throws if batch is empty', async () => {
      const builder = new DidBatchBuilder(mockApi, fullDid)
      await expect(builder.build(sign, 'test-account')).rejects.toThrow()
    })
    it.todo('successfully create a batch with only 1 extrinsic')
    it.todo('successfully create a batch with 1 extrinsic per required key')
    it.todo('successfully create a batch with 2 extrinsics per required key')
    it.todo(
      'successfully create a batch with 1 extrinsic per required key, repeated two times'
    )
  })
})

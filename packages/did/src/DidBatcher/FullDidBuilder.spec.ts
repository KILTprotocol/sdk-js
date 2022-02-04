/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import { ApiPromise } from '@polkadot/api'

import {
  DidKey,
  EncryptionKeyType,
  NewDidEncryptionKey,
  NewDidKey,
} from '@kiltprotocol/types'
import { ApiMocks } from '@kiltprotocol/testing'

import { FullDidBuilder } from './FullDidBuilder'

/**
 * @group unit/didbuilder
 */

function computeKeyId(key: DidKey['publicKey']): DidKey['id'] {
  return key[0].toString()
}

jest.mock('./FullDidBuilder.utils.js', () => ({
  deriveChainKeyId: jest.fn((api: ApiPromise, key: NewDidKey): DidKey['id'] =>
    computeKeyId(key.publicKey)
  ),
}))

describe('FullDidBuilder', () => {
  const encryptionKey = Uint8Array.from(Array(32).fill(0))
  const oldEncryptionKey: DidKey = {
    id: computeKeyId(encryptionKey),
    publicKey: encryptionKey,
    type: EncryptionKeyType.X25519,
  }
  const newKey: NewDidEncryptionKey = {
    publicKey: Uint8Array.from(Array(32).fill(1)),
    type: EncryptionKeyType.X25519,
  }

  const mockApi = ApiMocks.createAugmentedApi()

  describe('.addEncryptionKey()', () => {
    it('fails if the key already exists', async () => {
      const builder = new FullDidBuilder(mockApi, {
        keyAgreementKeys: [oldEncryptionKey],
      })

      expect(() => builder.addEncryptionKey(oldEncryptionKey)).toThrow()
    })

    it('fails if the key has been marked for deletion', async () => {
      const builder = new FullDidBuilder(mockApi, {
        keyAgreementKeys: [oldEncryptionKey],
      })

      builder.removeEncryptionKey(oldEncryptionKey.id)
      expect(() => builder.addEncryptionKey(oldEncryptionKey)).toThrow()
    })

    it('adds a new key successfully', async () => {
      const builder = new FullDidBuilder(mockApi)

      expect(() => builder.addEncryptionKey(newKey)).not.toThrow()
      expect(
        // @ts-ignore
        builder.newKeyAgreementKeys.get(computeKeyId(newKey.publicKey))
      ).toStrictEqual<NewDidEncryptionKey>(newKey)

      // Does not throw if the same key is added again
      expect(() => builder.addEncryptionKey(newKey)).not.toThrow()
    })
  })

  describe('.removeEncryptionKey()', () => {
    it('fails if the key does not exist', async () => {
      const builder = new FullDidBuilder(mockApi)

      expect(() => builder.removeEncryptionKey('randomID')).toThrow()
    })

    it('fails if the key has been marked for addition', async () => {
      const builder = new FullDidBuilder(mockApi)
      builder.addEncryptionKey(newKey)
      expect(() =>
        builder.removeEncryptionKey(computeKeyId(newKey.publicKey))
      ).toThrow()
    })

    it('removes a key successfully', async () => {
      const builder = new FullDidBuilder(mockApi, {
        keyAgreementKeys: [oldEncryptionKey],
      })
      expect(() =>
        builder.removeEncryptionKey(oldEncryptionKey.id)
      ).not.toThrow()
      expect(
        expect(
          // @ts-ignore
          builder.keyAgreementKeysToDelete.has(computeKeyId(newKey.publicKey))
        )
      )

      // Does not throw if the same key is removed again
      expect(() =>
        builder.removeEncryptionKey(oldEncryptionKey.id)
      ).not.toThrow()
    })
  })
})

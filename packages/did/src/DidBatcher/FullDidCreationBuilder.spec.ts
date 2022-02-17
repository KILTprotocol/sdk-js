/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/didbuilder
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import type { ApiPromise } from '@polkadot/api'

import { ApiMocks } from '@kiltprotocol/testing'
import {
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  EncryptionKeyType,
  NewDidEncryptionKey,
  NewDidKey,
  NewDidVerificationKey,
  VerificationKeyType,
} from '@kiltprotocol/types'

import { FullDidCreationBuilder } from './FullDidCreationBuilder'
import { LightDidDetails } from '../DidDetails'
import type { NewLightDidAuthenticationKey } from '../types.js'
import { computeKeyId } from './TestUtils'

jest.mock('./FullDidBuilder.utils.js', () => ({
  deriveChainKeyId: jest.fn((api: ApiPromise, key: NewDidKey): DidKey['id'] =>
    computeKeyId(key.publicKey)
  ),
}))

describe('FullDidCreationBuilder', () => {
  const mockApi = ApiMocks.createAugmentedApi()

  describe('Constructors', () => {
    describe('.fromLightDidDetails()', () => {
      const authKey: NewLightDidAuthenticationKey = {
        publicKey: Uint8Array.from(Array(32).fill(0)),
        type: VerificationKeyType.Ed25519,
      }
      const encKey: NewDidEncryptionKey = {
        publicKey: Uint8Array.from(Array(32).fill(0)),
        type: EncryptionKeyType.X25519,
      }
      const service1: DidServiceEndpoint = {
        id: 'id-1',
        types: ['type-1'],
        urls: ['url-1'],
      }
      const service2: DidServiceEndpoint = {
        id: 'id-2',
        types: ['type-2'],
        urls: ['url-2'],
      }
      const lightDidDetails = LightDidDetails.fromDetails({
        authenticationKey: authKey,
        encryptionKey: encKey,
        serviceEndpoints: [service1, service2],
      })
      it('sets the right keys when creating from a light DID', async () => {
        const builder = FullDidCreationBuilder.fromLightDidDetails(
          mockApi,
          lightDidDetails
        )

        // @ts-ignore
        expect(builder.authenticationKey).toStrictEqual<NewDidVerificationKey>({
          publicKey: authKey.publicKey,
          type: authKey.type,
        })
        expect(
          // @ts-ignore
          builder.newKeyAgreementKeys
        ).toStrictEqual<Map<DidEncryptionKey['id'], NewDidEncryptionKey>>(
          new Map([[computeKeyId(encKey.publicKey), encKey]])
        )
        expect(
          // @ts-ignore
          builder.newServiceEndpoints
        ).toStrictEqual<
          Map<DidServiceEndpoint['id'], Omit<DidServiceEndpoint, 'id'>>
        >(
          new Map([
            [service1.id, { types: service1.types, urls: service1.urls }],
            [service2.id, { types: service2.types, urls: service2.urls }],
          ])
        )
      })
    })
  })

  // TODO: complete these tests once SDK has been refactored to work with generic api object
  describe('.consume()', () => {
    it.todo('properly consumes the builder')
  })
})

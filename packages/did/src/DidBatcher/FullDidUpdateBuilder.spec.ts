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
  DidVerificationKey,
  EncryptionKeyType,
  KeyRelationship,
  NewDidEncryptionKey,
  NewDidKey,
  NewDidVerificationKey,
  VerificationKeyType,
} from '@kiltprotocol/types'

import { computeKeyId } from './TestUtils'
import { DemoKeystore, DemoKeystoreUtils } from '../DemoKeystore'
import { FullDidUpdateBuilder } from './FullDidUpdateBuilder'

jest.mock('./FullDidBuilder.utils.js', () => ({
  deriveChainKeyId: jest.fn((api: ApiPromise, key: NewDidKey): DidKey['id'] =>
    computeKeyId(key.publicKey)
  ),
}))

describe('FullDidUpdateBuilder', () => {
  const mockApi = ApiMocks.createAugmentedApi()
  const keystore = new DemoKeystore()

  describe('Constructors', () => {
    describe('.fromFullDidDetails()', () => {
      it('sets the right keys when creating from a full DID', async () => {
        const fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
          keystore,
          'test'
        )
        const builder = FullDidUpdateBuilder.fromFullDidDetails(
          mockApi,
          fullDid
        )

        // @ts-ignore
        expect(builder.oldAuthenticationKey).toStrictEqual<DidVerificationKey>(
          fullDid.authenticationKey
        )
        // @ts-ignore
        expect(builder.oldKeyAgreementKeys).toStrictEqual<
          Map<DidEncryptionKey['id'], Omit<DidEncryptionKey, 'id'>>
        >(
          new Map(
            (
              fullDid.getKeys(
                KeyRelationship.keyAgreement
              ) as DidEncryptionKey[]
            ).map(({ id, ...details }) => [id, { ...details }])
          )
        )
        // @ts-ignore
        expect(builder.oldAssertionKey).toStrictEqual<
          DidVerificationKey | undefined
        >(fullDid.attestationKey)
        // @ts-ignore
        expect(builder.oldDelegationKey).toStrictEqual<
          DidVerificationKey | undefined
        >(fullDid.delegationKey)
        // @ts-ignore
        expect(builder.oldServiceEndpoints).toStrictEqual<
          Map<DidServiceEndpoint['id'], Omit<DidServiceEndpoint, 'id'>>
        >(
          new Map(
            fullDid
              .getEndpoints()
              .map(({ id, ...details }) => [id, { ...details }])
          )
        )
      })
    })

    describe('.setAuthenticationKey()', () => {
      const oldAuthenticationKey: DidVerificationKey = {
        id: 'old-auth',
        publicKey: Uint8Array.from(Array(32).fill(0)),
        type: VerificationKeyType.Ed25519,
      }
      const newAuthenticationKey: NewDidVerificationKey = {
        publicKey: Uint8Array.from(Array(33).fill(1)),
        type: VerificationKeyType.Ecdsa,
      }

      it('fails if the authentication key is set twice', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test',
        })
        expect(() =>
          builder.setAuthenticationKey(newAuthenticationKey)
        ).not.toThrow()
        // Throws if called a second time
        expect(() =>
          builder.setAuthenticationKey(newAuthenticationKey)
        ).toThrow()
      })

      it('correctly sets the new authentication key and consumes the builder', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test',
        })
        expect(() =>
          builder.setAuthenticationKey(newAuthenticationKey)
        ).not.toThrow()

        // @ts-ignore
        expect(builder.firstBatch).toHaveLength(1)
        // @ts-ignore
        expect(builder.secondBatch).toHaveLength(0)
      })

      it('correctly creates a new batch after changing the authentication key', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test',
        })
        const newKeyBeforeUpdate: NewDidEncryptionKey = {
          publicKey: Uint8Array.from(Array(32).fill(10)),
          type: EncryptionKeyType.X25519,
        }
        const newKeyAfterUpdate: NewDidVerificationKey = {
          publicKey: Uint8Array.from(Array(32).fill(20)),
          type: VerificationKeyType.Sr25519,
        }
        expect(() => builder.addEncryptionKey(newKeyBeforeUpdate)).not.toThrow()
        expect(() =>
          builder.setAuthenticationKey(newAuthenticationKey)
        ).not.toThrow()
        expect(() => builder.setDelegationKey(newKeyAfterUpdate)).not.toThrow()

        // [key agreement update, authentication key set]
        // @ts-ignore
        expect(builder.firstBatch).toHaveLength(2)
        // [delegation key set]
        // @ts-ignore
        expect(builder.secondBatch).toHaveLength(1)
      })
    })
  })
})

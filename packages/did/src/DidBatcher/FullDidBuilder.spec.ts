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

import { ApiPromise } from '@polkadot/api'

import {
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  EncryptionKeyType,
  KeystoreSigner,
  NewDidEncryptionKey,
  NewDidKey,
  NewDidVerificationKey,
  SubmittableExtrinsic,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { ApiMocks } from '@kiltprotocol/testing'

import { FullDidBuilder, VerificationKeyAction } from './FullDidBuilder'
import { computeKeyId } from './TestUtils'

jest.mock('./FullDidBuilder.utils.js', () => ({
  deriveChainKeyId: jest.fn((api: ApiPromise, key: NewDidKey): DidKey['id'] =>
    computeKeyId(key.publicKey)
  ),
}))

class TestAbstractFullDidBuilder extends FullDidBuilder {
  public consume(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    signer: KeystoreSigner<any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    submitter: string
    // @ts-ignore
  ): Promise<SubmittableExtrinsic> {
    this.consumed = true
  }
}

describe('FullDidBuilder', () => {
  const mockApi = ApiMocks.createAugmentedApi()

  describe('Key agreement keys', () => {
    const newEncryptionKey: NewDidEncryptionKey = {
      publicKey: Uint8Array.from(Array(32).fill(1)),
      type: EncryptionKeyType.X25519,
    }
    describe('.addEncryptionKey()', () => {
      it('fails if the key has been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        // Second time the same key is added, it throws
        expect(() => builder.addEncryptionKey(newEncryptionKey)).toThrow()
      })

      it('adds a new key successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        expect(
          // @ts-ignore
          builder.newKeyAgreementKeys
        ).toStrictEqual<Map<DidEncryptionKey['id'], NewDidEncryptionKey>>(
          new Map([
            [computeKeyId(newEncryptionKey.publicKey), newEncryptionKey],
          ])
        )
      })
    })
  })

  describe('Attestation keys', () => {
    const newAttestationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(32).fill(11)),
      type: VerificationKeyType.Ecdsa,
    }
    describe('.setAttestationKey()', () => {
      it('fails if another key has already been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setAttestationKey(newAttestationKey)).not.toThrow()

        expect(() => builder.setAttestationKey(newAttestationKey)).toThrow()
      })

      it('sets an attestation key successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setAttestationKey(newAttestationKey)).not.toThrow()
        expect(
          // @ts-ignore
          builder.newAssertionKey
        ).toStrictEqual<VerificationKeyAction>({
          action: 'update',
          newKey: newAttestationKey,
        })
      })
    })
  })

  describe('Delegation keys', () => {
    const newDelegationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(32).fill(21)),
      type: VerificationKeyType.Ed25519,
    }
    describe('.setDelegation()', () => {
      it('fails if another key has already been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setDelegationKey(newDelegationKey)).not.toThrow()

        expect(() => builder.setDelegationKey(newDelegationKey)).toThrow()
      })

      it('sets a delegation key successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setDelegationKey(newDelegationKey)).not.toThrow()
        // @ts-ignore
        const delegationKeyAction = builder.newDelegationKey
        expect(delegationKeyAction).toStrictEqual<VerificationKeyAction>({
          action: 'update',
          newKey: newDelegationKey,
        })
      })
    })
  })

  describe('Service endpoints', () => {
    const newServiceEndpoint: DidServiceEndpoint = {
      id: 'id-new',
      types: ['type-new'],
      urls: ['url-new'],
    }

    describe('.addServiceEndpoint()', () => {
      it('fails if the service has already been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() =>
          builder.addServiceEndpoint(newServiceEndpoint)
        ).not.toThrow()

        expect(() => builder.addServiceEndpoint(newServiceEndpoint)).toThrow()
      })

      it('adds the service endpoint successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() =>
          builder.addServiceEndpoint(newServiceEndpoint)
        ).not.toThrow()

        expect(
          // @ts-ignore
          builder.newServiceEndpoints
        ).toStrictEqual<
          Map<DidServiceEndpoint['id'], Omit<DidServiceEndpoint, 'id'>>
        >(
          new Map([
            [
              newServiceEndpoint.id,
              {
                types: newServiceEndpoint.types,
                urls: newServiceEndpoint.urls,
              },
            ],
          ])
        )
      })
    })
  })
})

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
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
    const encryptionKey = Uint8Array.from(Array(32).fill(0))
    const oldEncryptionKey: DidKey = {
      id: computeKeyId(encryptionKey),
      publicKey: encryptionKey,
      type: EncryptionKeyType.X25519,
    }
    const newEncryptionKey: NewDidEncryptionKey = {
      publicKey: Uint8Array.from(Array(32).fill(1)),
      type: EncryptionKeyType.X25519,
    }
    describe('.addEncryptionKey()', () => {
      it('fails if the key already exists', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          keyAgreementKeys: [oldEncryptionKey],
        })

        expect(() => builder.addEncryptionKey(oldEncryptionKey)).toThrow()
      })

      it('fails if the key has been marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          keyAgreementKeys: [oldEncryptionKey],
        })

        expect(() =>
          builder.removeEncryptionKey(oldEncryptionKey.id)
        ).not.toThrow()
        expect(() => builder.addEncryptionKey(oldEncryptionKey)).toThrow()
      })

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

    describe('.removeEncryptionKey()', () => {
      it('fails if the key does not exist', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.removeEncryptionKey('randomID')).toThrow()
      })

      it('fails if the key has been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)
        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        expect(() =>
          builder.removeEncryptionKey(computeKeyId(newEncryptionKey.publicKey))
        ).toThrow()
      })

      it('fails if the key has been marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          keyAgreementKeys: [oldEncryptionKey],
        })

        expect(() =>
          builder.removeEncryptionKey(computeKeyId(oldEncryptionKey.publicKey))
        ).not.toThrow()
        // Second time the same key is removed, it throws
        expect(() =>
          builder.removeEncryptionKey(computeKeyId(oldEncryptionKey.publicKey))
        ).toThrow()
      })

      it('removes a key successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          keyAgreementKeys: [oldEncryptionKey],
        })
        expect(() =>
          builder.removeEncryptionKey(oldEncryptionKey.id)
        ).not.toThrow()
        expect(
          // @ts-ignore
          builder.keyAgreementKeysToDelete
        ).toStrictEqual<Set<DidEncryptionKey['id']>>(
          new Set([computeKeyId(oldEncryptionKey.publicKey)])
        )
      })
    })
  })

  describe('Attestation keys', () => {
    const attestationKey = Uint8Array.from(Array(32).fill(10))
    const oldAttestationKey: DidKey = {
      id: computeKeyId(attestationKey),
      publicKey: attestationKey,
      type: VerificationKeyType.Ed25519,
    }
    const newAttestationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(32).fill(11)),
      type: VerificationKeyType.Ecdsa,
    }
    describe('.setAttestationKey()', () => {
      it('fails if the key has already been marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          assertionKey: oldAttestationKey,
        })

        expect(() => builder.removeAttestationKey()).not.toThrow()

        expect(() => builder.setAttestationKey(newAttestationKey)).toThrow()
      })

      it('fails if another key has already been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setAttestationKey(oldAttestationKey)).not.toThrow()

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

    describe('.removeAttestationKey()', () => {
      it('fails if the DID does not have an attestation key', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('fails if another attestation key was already marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setAttestationKey(oldAttestationKey)).not.toThrow()

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('fails if the old attestation key was already marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          assertionKey: oldAttestationKey,
        })

        expect(() => builder.removeAttestationKey()).not.toThrow()

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('removes the attestation key successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          assertionKey: oldAttestationKey,
        })

        expect(() => builder.removeAttestationKey()).not.toThrow()
        expect(
          // @ts-ignore
          builder.newAssertionKey
        ).toStrictEqual<VerificationKeyAction>({
          action: 'delete',
        })
      })
    })
  })

  describe('Delegation keys', () => {
    const delegationKey = Uint8Array.from(Array(32).fill(20))
    const oldDelegationKey: DidKey = {
      id: computeKeyId(delegationKey),
      publicKey: delegationKey,
      type: VerificationKeyType.Sr25519,
    }
    const newDelegationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(32).fill(21)),
      type: VerificationKeyType.Ed25519,
    }
    describe('.setDelegation()', () => {
      it('fails if the key has already been marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          delegationKey: oldDelegationKey,
        })

        expect(() => builder.removeDelegationKey()).not.toThrow()

        expect(() => builder.setDelegationKey(newDelegationKey)).toThrow()
      })

      it('fails if another key has already been marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setDelegationKey(oldDelegationKey)).not.toThrow()

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

    describe('.removeDelegationKey()', () => {
      it('fails if the DID does not have a delegation key', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('fails if another delegation key was already marked for addition', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.setDelegationKey(oldDelegationKey)).not.toThrow()

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('fails if the old delegation key was already marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          delegationKey: oldDelegationKey,
        })

        expect(() => builder.removeDelegationKey()).not.toThrow()

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('removes the delegation key successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          delegationKey: oldDelegationKey,
        })

        expect(() => builder.removeDelegationKey()).not.toThrow()
        expect(
          // @ts-ignore
          builder.newDelegationKey
        ).toStrictEqual<VerificationKeyAction>({
          action: 'delete',
        })
      })
    })
  })

  describe('Service endpoints', () => {
    const oldServiceEndpoint: DidServiceEndpoint = {
      id: 'id-old',
      types: ['type-old'],
      urls: ['url-old'],
    }
    const newServiceEndpoint: DidServiceEndpoint = {
      id: 'id-new',
      types: ['type-new'],
      urls: ['url-new'],
    }

    describe('.addServiceEndpoint()', () => {
      it('fails if the service is already present in the DID', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          serviceEndpoints: [oldServiceEndpoint],
        })

        expect(() => builder.addServiceEndpoint(oldServiceEndpoint)).toThrow()
      })

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

    describe('.removeServiceEndpoint()', () => {
      it('fails if the service is not present in the DID', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi)

        expect(() => builder.removeServiceEndpoint('random-id')).toThrow()
      })

      it('fails if the service has already been marked for deletion', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          serviceEndpoints: [oldServiceEndpoint],
        })

        expect(() =>
          builder.removeServiceEndpoint(oldServiceEndpoint.id)
        ).not.toThrow()

        expect(() =>
          builder.removeServiceEndpoint(oldServiceEndpoint.id)
        ).toThrow()
      })

      it('removes the service endpoint successfully', async () => {
        const builder = new TestAbstractFullDidBuilder(mockApi, {
          serviceEndpoints: [oldServiceEndpoint],
        })

        expect(() =>
          builder.removeServiceEndpoint(oldServiceEndpoint.id)
        ).not.toThrow()

        expect(
          // @ts-ignore
          builder.serviceEndpointsToDelete
        ).toStrictEqual<Set<DidServiceEndpoint['id']>>(
          new Set([oldServiceEndpoint.id])
        )
      })
    })
  })
})

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
import { VerificationKeyAction } from './FullDidBuilder'

jest.mock('./FullDidBuilder.utils.js', () => ({
  deriveChainKeyId: jest.fn((api: ApiPromise, key: NewDidKey): DidKey['id'] =>
    computeKeyId(key.publicKey)
  ),
}))

describe('FullDidUpdateBuilder', () => {
  const mockApi = ApiMocks.createAugmentedApi()
  const keystore = new DemoKeystore()
  const oldAuthenticationKey: DidVerificationKey = {
    id: 'old-auth',
    publicKey: Uint8Array.from(Array(32).fill(0)),
    type: VerificationKeyType.Ed25519,
  }

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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          keyAgreementKeys: [oldEncryptionKey],
        })

        expect(() => builder.addEncryptionKey(oldEncryptionKey)).toThrow()
      })

      it('fails if the key has been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          keyAgreementKeys: [oldEncryptionKey],
        })

        expect(() =>
          builder.removeEncryptionKey(oldEncryptionKey.id)
        ).not.toThrow()
        expect(() => builder.addEncryptionKey(oldEncryptionKey)).toThrow()
      })

      it('fails if the key has been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        // Second time the same key is added, it throws
        expect(() => builder.addEncryptionKey(newEncryptionKey)).toThrow()
      })

      it('adds a new key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.removeEncryptionKey('randomID')).toThrow()
      })

      it('fails if the key has been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })
        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        expect(() =>
          builder.removeEncryptionKey(computeKeyId(newEncryptionKey.publicKey))
        ).toThrow()
      })

      it('fails if the key has been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
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
      publicKey: Uint8Array.from(Array(33).fill(11)),
      type: VerificationKeyType.Ecdsa,
    }
    describe('.setAttestationKey()', () => {
      it('fails if the key has already been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          assertionKey: oldAttestationKey,
        })

        expect(() => builder.removeAttestationKey()).not.toThrow()

        expect(() => builder.setAttestationKey(newAttestationKey)).toThrow()
      })

      it('fails if another key has already been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.setAttestationKey(oldAttestationKey)).not.toThrow()

        expect(() => builder.setAttestationKey(newAttestationKey)).toThrow()
      })

      it('sets an attestation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('fails if another attestation key was already marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.setAttestationKey(oldAttestationKey)).not.toThrow()

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('fails if the old attestation key was already marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          assertionKey: oldAttestationKey,
        })

        expect(() => builder.removeAttestationKey()).not.toThrow()

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('removes the attestation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          delegationKey: oldDelegationKey,
        })

        expect(() => builder.removeDelegationKey()).not.toThrow()

        expect(() => builder.setDelegationKey(newDelegationKey)).toThrow()
      })

      it('fails if another key has already been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.setDelegationKey(oldDelegationKey)).not.toThrow()

        expect(() => builder.setDelegationKey(newDelegationKey)).toThrow()
      })

      it('sets a delegation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('fails if another delegation key was already marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.setDelegationKey(oldDelegationKey)).not.toThrow()

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('fails if the old delegation key was already marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          delegationKey: oldDelegationKey,
        })

        expect(() => builder.removeDelegationKey()).not.toThrow()

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('removes the delegation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
          serviceEndpoints: [oldServiceEndpoint],
        })

        expect(() => builder.addServiceEndpoint(oldServiceEndpoint)).toThrow()
      })

      it('fails if the service has already been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() =>
          builder.addServiceEndpoint(newServiceEndpoint)
        ).not.toThrow()

        expect(() => builder.addServiceEndpoint(newServiceEndpoint)).toThrow()
      })

      it('adds the service endpoint successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
        })

        expect(() => builder.removeServiceEndpoint('random-id')).toThrow()
      })

      it('fails if the service has already been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
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
        const builder = new FullDidUpdateBuilder(mockApi, {
          authenticationKey: oldAuthenticationKey,
          identifier: 'test-identifier',
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

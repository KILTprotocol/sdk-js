/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/didbuilder
 */

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
import { FullDidDetails } from '../DidDetails'

jest.mock('./FullDidBuilder.utils.js', () => ({
  deriveChainKeyId: jest.fn((api: ApiPromise, key: NewDidKey): DidKey['id'] =>
    computeKeyId(key.publicKey)
  ),
}))

const keystore = new DemoKeystore()
const mockApi = ApiMocks.createAugmentedApi()

describe('FullDidUpdateBuilder', () => {
  describe('Constructor', () => {
    let fullDid: FullDidDetails
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-constructor'
      )
    })
    it('sets the right keys when creating from a full DID', async () => {
      const builder = new FullDidUpdateBuilder(mockApi, fullDid)

      // @ts-ignore
      expect(builder.oldAuthenticationKey).toStrictEqual<DidVerificationKey>(
        fullDid.authenticationKey
      )
      // @ts-ignore
      expect(builder.oldKeyAgreementKeys).toStrictEqual<
        Map<DidEncryptionKey['id'], Omit<DidEncryptionKey, 'id'>>
      >(
        new Map(
          fullDid
            .getEncryptionKeys(KeyRelationship.keyAgreement)
            .map(({ id, ...details }) => [id, { ...details }])
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
    let fullDid: FullDidDetails
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-auth-key',
        { keyRelationships: new Set([]) }
      )
    })
    const newAuthenticationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(33).fill(1)),
      type: VerificationKeyType.Ecdsa,
    }

    it('fails if the authentication key is set twice', async () => {
      const builder = new FullDidUpdateBuilder(mockApi, fullDid)

      expect(() =>
        builder.setAuthenticationKey(newAuthenticationKey)
      ).not.toThrow()
      // Throws if called a second time
      expect(() => builder.setAuthenticationKey(newAuthenticationKey)).toThrow()
    })

    it('correctly sets the new authentication key', async () => {
      const builder = new FullDidUpdateBuilder(mockApi, fullDid)
      expect(() =>
        builder.setAuthenticationKey(newAuthenticationKey)
      ).not.toThrow()

      // @ts-ignore
      expect(builder.batch).toHaveLength(1)
    })
  })

  describe('Key agreement keys', () => {
    let fullDid: FullDidDetails
    const newEncryptionKey: NewDidEncryptionKey = {
      publicKey: Uint8Array.from(Array(32).fill(1)),
      type: EncryptionKeyType.X25519,
    }
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-enc-key',
        { keyRelationships: new Set([KeyRelationship.keyAgreement]) }
      )
    })

    describe('.addEncryptionKey()', () => {
      it('fails if the key already exists', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.addEncryptionKey(fullDid.encryptionKey!)).toThrow()
      })

      it('fails if the key has been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.removeEncryptionKey(fullDid.encryptionKey!.id)
        ).not.toThrow()
        expect(() => builder.addEncryptionKey(fullDid.encryptionKey!)).toThrow()
      })

      it('fails if the key has been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        // Second time the same key is added, it throws
        expect(() => builder.addEncryptionKey(newEncryptionKey)).toThrow()
      })

      it('adds a new key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

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
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeEncryptionKey('randomID')).toThrow()
      })

      it('fails if the key has been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.addEncryptionKey(newEncryptionKey)).not.toThrow()
        expect(() =>
          builder.removeEncryptionKey(computeKeyId(newEncryptionKey.publicKey))
        ).toThrow()
      })

      it('fails if the key has been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.removeEncryptionKey(fullDid.encryptionKey!.id)
        ).not.toThrow()
        // Second time the same key is removed, it throws
        expect(() =>
          builder.removeEncryptionKey(fullDid.encryptionKey!.id)
        ).toThrow()
      })

      it('removes a key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.removeEncryptionKey(fullDid.encryptionKey!.id)
        ).not.toThrow()
        expect(
          // @ts-ignore
          builder.keyAgreementKeysToDelete
        ).toStrictEqual<Set<DidEncryptionKey['id']>>(
          new Set([fullDid.encryptionKey!.id])
        )
      })
    })

    describe('.removeAllEncryptionKeys()', () => {
      it('removes all encryption keys successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeAllEncryptionKeys()).not.toThrow()
        expect(
          // @ts-ignore
          builder.keyAgreementKeysToDelete
        ).toStrictEqual<Set<DidEncryptionKey['id']>>(
          new Set([fullDid.encryptionKey!.id])
        )
      })
    })
  })

  describe('Attestation keys', () => {
    let fullDid: FullDidDetails
    const newAttestationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(33).fill(11)),
      type: VerificationKeyType.Ecdsa,
    }
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-att-key',
        { keyRelationships: new Set([KeyRelationship.assertionMethod]) }
      )
    })
    describe('.setAttestationKey()', () => {
      it('fails if the key has already been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeAttestationKey()).not.toThrow()
        expect(() => builder.setAttestationKey(newAttestationKey)).toThrow()
      })

      it('fails if another key has already been marked for addition', async () => {
        // Does not have any attestation key set
        const emptyDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
          keystore,
          '//test-att-key-2',
          {
            keyRelationships: new Set([]),
          }
        )
        const builder = new FullDidUpdateBuilder(mockApi, emptyDid)

        expect(() =>
          builder.setAttestationKey(fullDid.attestationKey!)
        ).not.toThrow()
        expect(() => builder.setAttestationKey(newAttestationKey)).toThrow()
      })

      it('sets an attestation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

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
        // Does not have any attestation key set
        const emptyDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
          keystore,
          '//test-att-key-3',
          {
            keyRelationships: new Set([]),
          }
        )
        const builder = new FullDidUpdateBuilder(mockApi, emptyDid)

        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('fails if another attestation key was already marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.setAttestationKey(newAttestationKey)).not.toThrow()
        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('fails if the old attestation key was already marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeAttestationKey()).not.toThrow()
        expect(() => builder.removeAttestationKey()).toThrow()
      })

      it('removes the attestation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

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
    let fullDid: FullDidDetails
    const newDelegationKey: NewDidVerificationKey = {
      publicKey: Uint8Array.from(Array(33).fill(21)),
      type: VerificationKeyType.Ecdsa,
    }
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-del-key',
        { keyRelationships: new Set([KeyRelationship.capabilityDelegation]) }
      )
    })
    describe('.setDelegationKey()', () => {
      it('fails if the key has already been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeDelegationKey()).not.toThrow()
        expect(() => builder.setDelegationKey(newDelegationKey)).toThrow()
      })

      it('fails if another key has already been marked for addition', async () => {
        // Does not have any delegation key set
        const emptyDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
          keystore,
          '//test-del-key-2',
          {
            keyRelationships: new Set([]),
          }
        )
        const builder = new FullDidUpdateBuilder(mockApi, emptyDid)

        expect(() =>
          builder.setDelegationKey(fullDid.delegationKey!)
        ).not.toThrow()
        expect(() => builder.setDelegationKey(newDelegationKey)).toThrow()
      })

      it('sets a delegation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.setDelegationKey(newDelegationKey)).not.toThrow()
        expect(
          // @ts-ignore
          builder.newDelegationKey
        ).toStrictEqual<VerificationKeyAction>({
          action: 'update',
          newKey: newDelegationKey,
        })
      })
    })

    describe('.removeDelegationKey()', () => {
      it('fails if the DID does not have a delegation key', async () => {
        // Does not have any delegation key set
        const emptyDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
          keystore,
          '//test-del-key-3',
          {
            keyRelationships: new Set([]),
          }
        )
        const builder = new FullDidUpdateBuilder(mockApi, emptyDid)

        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('fails if another delegation key was already marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.setDelegationKey(newDelegationKey)).not.toThrow()
        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('fails if the old delegation key was already marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeDelegationKey()).not.toThrow()
        expect(() => builder.removeDelegationKey()).toThrow()
      })

      it('removes the delegation key successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

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
    let fullDid: FullDidDetails
    const newServiceEndpoint: DidServiceEndpoint = {
      id: 'id-new',
      types: ['type-new'],
      urls: ['url-new'],
    }
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-endpoint',
        { endpoints: { 'id-old': { types: ['type-old'], urls: ['url-old'] } } }
      )
    })

    describe('.addServiceEndpoint()', () => {
      it('fails if the service is already present in the DID', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.addServiceEndpoint(fullDid.getEndpoint('id-old')!)
        ).toThrow()
      })

      it('fails if the service has already been marked for addition', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.addServiceEndpoint(newServiceEndpoint)
        ).not.toThrow()
        expect(() => builder.addServiceEndpoint(newServiceEndpoint)).toThrow()
      })

      it('adds the service endpoint successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

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
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() => builder.removeServiceEndpoint('random-id')).toThrow()
      })

      it('fails if the service has already been marked for deletion', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.removeServiceEndpoint(fullDid.getEndpoint('id-old')!.id)
        ).not.toThrow()

        expect(() =>
          builder.removeServiceEndpoint(fullDid.getEndpoint('id-old')!.id)
        ).toThrow()
      })

      it('removes the service endpoint successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)

        expect(() =>
          builder.removeServiceEndpoint(fullDid.getEndpoint('id-old')!.id)
        ).not.toThrow()

        expect(
          // @ts-ignore
          builder.serviceEndpointsToDelete
        ).toStrictEqual<Set<DidServiceEndpoint['id']>>(
          new Set([fullDid.getEndpoint('id-old')!.id])
        )
      })
    })
    describe('.removeAllServiceEndpoints()', () => {
      it('removes all service endpoints successfully', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)
        expect(() => builder.removeAllServiceEndpoints()).not.toThrow()
        expect(
          // @ts-ignore
          builder.serviceEndpointsToDelete
        ).toStrictEqual<Set<DidServiceEndpoint['id']>>(
          new Set([fullDid.getEndpoint('id-old')!.id])
        )
      })
    })
  })

  // TODO: complete these tests once SDK has been refactored to work with generic api object
  describe('Building', () => {
    let fullDid: FullDidDetails
    beforeAll(async () => {
      fullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
        keystore,
        '//test-building'
      )
    })
    describe('.build()', () => {
      it('throws if batch is empty', async () => {
        const builder = new FullDidUpdateBuilder(mockApi, fullDid)
        await expect(builder.build(keystore, 'test-account')).rejects.toThrow()
      })
      it.todo('properly consumes the builder')
    })
  })
})

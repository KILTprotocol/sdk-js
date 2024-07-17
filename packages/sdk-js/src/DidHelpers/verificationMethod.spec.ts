/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidDocument, KiltKeyringPair } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
} from '../../../../tests/testUtils/index.js'
import { ConfigService } from '../index.js'
import {
  removeVerificationMethod,
  setVerificationMethod,
} from './verificationMethod.js'
import { transact } from './transact.js'

jest.mock('./transact.js')

const mockedTransact = jest.mocked(transact)
const mockedApi = ApiMocks.createAugmentedApi()

let didDocument: DidDocument
let keypair: KiltKeyringPair
beforeAll(async () => {
  ConfigService.set({ api: mockedApi })

  keypair = Crypto.makeKeypairFromUri('//Alice')
  const { id, verificationMethod, authentication } =
    await createLocalDemoFullDidFromKeypair(keypair, {
      verificationRelationships: new Set(['assertionMethod']),
    })
  didDocument = {
    id,
    authentication,
    assertionMethod: authentication,
    verificationMethod: verificationMethod?.filter(
      (vm) => vm.id === authentication![0]
    ),
  }
})

describe('signing keys', () => {
  it('creates a set VM tx', async () => {
    setVerificationMethod({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      publicKey: keypair,
      relationship: 'assertionMethod',
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'did',
            method: 'DidUpdated',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: {
        section: 'did',
        method: 'setAttestationKey',
        args: { new_key: { Ed25519: Crypto.u8aToHex(keypair.publicKey) } },
      },
    })
  })

  it('creates a remove VM tx', async () => {
    didDocument.assertionMethod = didDocument.authentication
    removeVerificationMethod({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      verificationMethodId: didDocument.assertionMethod![0],
      relationship: 'assertionMethod',
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'did',
            method: 'DidUpdated',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: {
        section: 'did',
        method: 'removeAttestationKey',
      },
    })
  })
})

describe('key agreement keys', () => {
  it('creates a set VM tx for the first key agreement', async () => {
    setVerificationMethod({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      publicKey: { publicKey: keypair.publicKey, type: 'x25519' } as any,
      relationship: 'keyAgreement',
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'did',
            method: 'DidUpdated',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: {
        section: 'utility',
        method: 'batchAll',
        args: {
          calls: [
            {
              section: 'did',
              method: 'addKeyAgreementKey',
              args: { new_key: { X25519: Crypto.u8aToHex(keypair.publicKey) } },
            },
          ],
        },
      },
    })
  })

  it('creates a set VM tx for the second key agreement', async () => {
    didDocument.keyAgreement = [
      `${didDocument.id}#${Crypto.hashStr('keyAgreement1')}`,
    ]
    setVerificationMethod({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      publicKey: { publicKey: keypair.publicKey, type: 'x25519' } as any,
      relationship: 'keyAgreement',
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'did',
            method: 'DidUpdated',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: {
        section: 'utility',
        method: 'batchAll',
        args: {
          calls: [
            {
              section: 'did',
              method: 'removeKeyAgreementKey',
              args: { key_id: expect.stringContaining('0x') },
            },
            {
              section: 'did',
              method: 'addKeyAgreementKey',
              args: { new_key: { X25519: Crypto.u8aToHex(keypair.publicKey) } },
            },
          ],
        },
      },
    })
  })

  it('creates a remove VM tx', async () => {
    removeVerificationMethod({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      verificationMethodId: didDocument.keyAgreement![0],
      relationship: 'keyAgreement',
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'did',
            method: 'DidUpdated',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: {
        section: 'did',
        method: 'removeKeyAgreementKey',
      },
    })
  })
})

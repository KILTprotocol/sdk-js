/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidDocument, DidUrl, KiltKeyringPair } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
} from '../../../../tests/testUtils/index.js'
import { ConfigService } from '../index.js'
import { transact } from './index.js'
import { addService, removeService } from './service.js'

jest.mock('./transact.js')

const mockedTransact = jest.mocked(transact)
const mockedApi = ApiMocks.createAugmentedApi()

describe.each(['#my_service', 'did:kilt:4abctest#my_service'])(
  'service management with id %s',
  (serviceId) => {
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

    it('creates an add service tx', async () => {
      addService({
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
        service: {
          id: serviceId as DidUrl,
          type: ['http://schema.org/EmailService'],
          serviceEndpoint: ['mailto:info@kilt.io'],
        },
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
          args: {
            service_endpoint: {
              id: 'my_service',
              serviceTypes: ['http://schema.org/EmailService'],
              urls: ['mailto:info@kilt.io'],
            },
          },
          section: 'did',
          method: 'addServiceEndpoint',
        },
      })
    })

    it('creates a remove service tx', async () => {
      removeService({
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
        id: serviceId as DidUrl,
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
          args: {
            service_id: 'my_service',
          },
          section: 'did',
          method: 'removeServiceEndpoint',
        },
      })
    })
  }
)

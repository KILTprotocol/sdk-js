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
import { deactivateDid } from './deactivateDid.js'
import { transactInternal } from './transact.js'

jest.mock('./transact.js')

const mockedTransact = jest.mocked(transactInternal)
const mockedApi = ApiMocks.createAugmentedApi()

describe('deactivate', () => {
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

  it('creates a deactivate did tx', async () => {
    deactivateDid({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transactInternal>[0]>>({
        callFactory: expect.any(Function),
        expectedEvents: expect.arrayContaining([
          {
            section: 'did',
            method: 'DidDeleted',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(
      await mockedTransact.mock.lastCall?.[0]
        .callFactory()
        .then((f) => f.toHuman())
    ).toMatchObject({
      method: { method: 'delete', section: 'did' },
    })
  })
})

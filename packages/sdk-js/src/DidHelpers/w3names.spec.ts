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
import { claimWeb3Name, releaseWeb3Name, transact } from './index.js'

jest.mock('./transact.js')

const mockedTransact = jest.mocked(transact)
const mockedApi = ApiMocks.createAugmentedApi()

describe('w3n', () => {
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

  it('creates a claim w3n tx', async () => {
    claimWeb3Name({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      name: 'paul',
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'web3Names',
            method: 'Web3NameClaimed',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: { args: { name: 'paul' }, method: 'claim', section: 'web3Names' },
    })
  })

  it('creates a release w3n tx', async () => {
    releaseWeb3Name({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
    })

    expect(mockedTransact).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<Parameters<typeof transact>[0]>>({
        call: expect.any(Object),
        expectedEvents: expect.arrayContaining([
          {
            section: 'web3Names',
            method: 'Web3NameReleased',
          },
        ]),
        didDocument,
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
      })
    )
    expect(mockedTransact.mock.lastCall?.[0].call.toHuman()).toMatchObject({
      method: { method: 'releaseByOwner', section: 'web3Names' },
    })
  })
})

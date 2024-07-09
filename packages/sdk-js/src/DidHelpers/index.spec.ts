import { ConfigService } from '../index.js'

import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
} from '../../../../tests/testUtils/index.js'

jest.mock('@kiltprotocol/did', () => {
  return {
    ...jest.requireActual('@kiltprotocol/did'),
    resolver: { resolve: jest.fn() },
  }
})
import { resolver } from '@kiltprotocol/did'
import { transact } from './index.js'
import { Crypto } from '@kiltprotocol/utils'
import { DidDocument, KiltKeyringPair } from '@kiltprotocol/types'
// import { SubmittableResult } from '@polkadot/api'

const mockedApi = ApiMocks.createAugmentedApi()

describe('transact', () => {
  let didDocument: DidDocument
  let keypair: KiltKeyringPair
  beforeAll(async () => {
    ConfigService.set({ api: mockedApi })
    // jest
    //   .mocked(mockedApi.derive.tx.events)
    //   .mockResolvedValue(mockedApi.createType(''))

    keypair = Crypto.makeKeypairFromUri('//Alice')
    didDocument = await createLocalDemoFullDidFromKeypair(keypair)
    jest.mocked(resolver).resolve.mockImplementation((did) => {
      if (did === didDocument.id) {
        return { didDocument } as any
      }
      throw new Error()
    })
  })

  it('creates a tx and checks status', async () => {
    const { txHex } = await transact({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      call: mockedApi.tx.attestation.add(
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(1),
        null
      ),
      expectedEvents: [
        { section: 'attestation', method: 'AttestationCreated' },
      ],
    }).getSubmittable()

    expect(txHex).toContain('0x')
    const parsed = mockedApi.tx(txHex)
    expect(parsed.method).toMatchObject({
      section: 'did',
      method: 'submitDidCall',
    })
    // expect(
    //   checkResult(
    //     new SubmittableResult({
    //       blockNumber: mockedApi.createType('BlockNumber', 1000),
    //       status: mockedApi.createType('ExtrinsicStatus', {
    //         inBlock: new Uint8Array(32).fill(2),
    //       }),
    //       txHash: parsed.hash,
    //     })
    //   )
    // )
  })
})

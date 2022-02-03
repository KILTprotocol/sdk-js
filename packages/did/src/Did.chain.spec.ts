/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { TypeRegistry } from '@polkadot/types'
import { ApiPromise } from '@polkadot/api'
import { encodeAddress, randomAsHex } from '@polkadot/util-crypto'
import { ApiMocks } from '@kiltprotocol/testing'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { BN, hexToU8a } from '@polkadot/util'
import { DidKey, DidServiceEndpoint } from '@kiltprotocol/types'
import {
  IDidChainRecordJSON,
  queryDepositAmount,
  queryDetails,
  queryEndpointsCounts,
  queryKey,
  queryNonce,
  queryServiceEndpoint,
  queryServiceEndpoints,
} from './Did.chain'

describe('provider mocks', () => {
  let provider: ApiMocks.MockProvider
  let api: ApiPromise
  let registry: TypeRegistry

  beforeAll(async () => {
    registry = new TypeRegistry()
    provider = new ApiMocks.MockProvider(registry)

    api = new ApiPromise({ provider })
    BlockchainApiConnection.setConnection(
      api.isReady.then((a) => new Blockchain(a))
    )
  })

  afterEach(() => {
    provider.resetState()
  })

  it('resolves nonexistent dids to null', async () => {
    const address = encodeAddress(randomAsHex(32), 38)
    await expect(queryDetails(address)).resolves.toBe(null)
  })

  it('queries existing dids', async () => {
    const address = encodeAddress(randomAsHex(32), 38)
    const keyId = randomAsHex(32)
    const key = randomAsHex(32)
    const didInfos = {
      lastTxCounter: 5,
      authenticationKey: keyId,
      publicKeys: {
        [keyId]: {
          blockNumber: 1,
          key: { PublicVerificationKey: { sr25519: key } },
        },
      },
    }
    provider.setQueryState(didInfos, api.query.did.did, address)

    await expect(queryDetails(address)).resolves.toMatchObject<
      Partial<IDidChainRecordJSON>
    >({
      authenticationKey: keyId,
      publicKeys: [
        {
          id: keyId,
          type: 'sr25519',
          publicKey: hexToU8a(key),
          includedAt: new BN(1),
        },
      ],
      lastTxCounter: new BN(5),
    })

    await expect(queryKey(address, keyId)).resolves.toMatchObject<DidKey>({
      id: keyId,
      type: 'sr25519',
      publicKey: hexToU8a(key),
      includedAt: new BN(1),
    })

    await expect(queryNonce(address)).resolves.toMatchObject(new BN(5))
  })

  describe('services', () => {
    it('queries service endpoint', async () => {
      const address = encodeAddress(randomAsHex(32), 38)
      const serviceData = {
        id: '12345',
        serviceTypes: ['ExampleService'],
        urls: ['example.com', 'fallback.example.com'],
      }
      provider.setQueryState(
        serviceData,
        api.query.did.serviceEndpoints,
        address,
        serviceData.id
      )
      await expect(
        queryServiceEndpoint(address, serviceData.id)
      ).resolves.toMatchObject<DidServiceEndpoint>({
        id: serviceData.id,
        types: serviceData.serviceTypes,
        urls: serviceData.urls,
      })
    })

    it('queries endpoint counts', async () => {
      const address = encodeAddress(randomAsHex(32), 38)
      provider.setQueryState(5, api.query.did.didEndpointsCount, address)
      await expect(queryEndpointsCounts(address)).resolves.toMatchObject(
        new BN(5)
      )
    })
  })

  it('gets deposit amount', async () => {
    expect(queryDepositAmount()).resolves.toMatchInlineSnapshot(
      `2000000000000000`
    )
  })

  afterAll(async () => {
    await api.disconnect()
  })
})

// for what can't be mocked easily with a provider mock
describe('api mocks', () => {
  let mockedApi: any
  let augmentedApi: ApiPromise
  beforeAll(() => {
    augmentedApi = ApiMocks.createAugmentedApi()
    mockedApi = {
      query: {
        did: {
          serviceEndpoints: {
            entries: jest.fn(),
            _typeFactory: ApiMocks.getQueryTypeFactory(
              augmentedApi.query.did.serviceEndpoints
            ),
          },
        },
      },
    }
    BlockchainApiConnection.setConnection(
      Promise.resolve(new Blockchain(mockedApi))
    )
  })
  it('queries service endpoints', async () => {
    const address = encodeAddress(randomAsHex(32), 38)
    const servicesData = [
      {
        id: '12345',
        serviceTypes: ['ExampleService'],
        urls: ['example.com', 'fallback.example.com'],
      },
      {
        id: '67890',
        serviceTypes: ['AnotherService'],
        urls: ['example2.com'],
      },
    ]
    mockedApi.query.did.serviceEndpoints.entries.mockReturnValue(
      servicesData.map((d) => {
        return [undefined, mockedApi.query.did.serviceEndpoints._typeFactory(d)]
      })
    )
    await expect(queryServiceEndpoints(address)).resolves.toMatchObject<
      DidServiceEndpoint[]
    >(
      servicesData.map((serviceData) => ({
        id: serviceData.id,
        types: serviceData.serviceTypes,
        urls: serviceData.urls,
      }))
    )
  })
})

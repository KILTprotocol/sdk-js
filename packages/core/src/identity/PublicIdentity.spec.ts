/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/identity
 */

import { U8aFixed } from '@polkadot/types'
import type { IPublicIdentity } from '@kiltprotocol/types'
import { TypeRegistry as TYPE_REGISTRY } from '@kiltprotocol/chain-helpers'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import PublicIdentity, { IURLResolver } from './PublicIdentity'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

describe('PublicIdentity', () => {
  const pubKey = new U8aFixed(TYPE_REGISTRY, 'pub-key', 256)
  const boxKey = new U8aFixed(TYPE_REGISTRY, 'box-key', 256)
  Kilt.config({ address: 'ws://testString' })
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.did.dIDs = jest.fn(
    async (id) => {
      switch (id) {
        case '1':
          return mockChainQueryReturn('did', 'dIDs', [
            pubKey,
            boxKey,
            [14, 75, 23, 14, 55],
          ])
        case '2':
          return mockChainQueryReturn('did', 'dIDs', [
            pubKey,
            boxKey,
            undefined,
          ])

        default:
          return mockChainQueryReturn('did', 'dIDs')
      }
    }
  )

  it('should resolve external dids', async () => {
    const externalPubId: IPublicIdentity | null = await PublicIdentity.resolveFromDid(
      'did:sov:1',
      {
        resolve: async (): Promise<Record<string, unknown>> => {
          return {
            didDocument: {
              id: 'external-id',
              publicKey: [
                {
                  id: 'external-id#key-1',
                  type: 'X25519Salsa20Poly1305Key2018',
                  publicKeyHex: 'external-box-key',
                },
              ],
              service: [
                {
                  id: 'external-id#service-1',
                  type: 'KiltMessagingService',
                  serviceEndpoint: 'external-service-address',
                },
              ],
            },
          }
        },
      } as IURLResolver
    )
    expect(externalPubId).toEqual({
      address: 'external-id',
      boxPublicKeyAsHex: 'external-box-key',
      serviceAddress: 'external-service-address',
    })
  })

  it('should resolve internal', async () => {
    const internalPubId: IPublicIdentity | null = await PublicIdentity.resolveFromDid(
      'did:kilt:1',
      {
        resolve: async (): Promise<Record<string, unknown>> => {
          return {
            id: 'internal-id',
            publicKey: [
              {
                id: 'internal-id#key-1',
                type: 'X25519Salsa20Poly1305Key2018',
                publicKeyHex: 'internal-box-key',
              },
            ],
            service: [
              {
                id: 'internal-id#service-1',
                type: 'KiltMessagingService',
                serviceEndpoint: 'internal-service-address',
              },
            ],
          }
        },
      } as IURLResolver
    )
    expect(internalPubId).toEqual({
      address: 'internal-id',
      boxPublicKeyAsHex: 'internal-box-key',
      serviceAddress: 'internal-service-address',
    })

    const bcOnlyPubId: IPublicIdentity | null = await PublicIdentity.resolveFromDid(
      'did:kilt:2',
      {} as IURLResolver
    )
    expect(bcOnlyPubId).toEqual({
      address: '2',
      boxPublicKeyAsHex: boxKey.toString(),
      serviceAddress: undefined,
    })

    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (): Promise<Record<string, unknown>> => {
          return {
            id: 'internal-id',
            publicKey: [],
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(null)
    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (): Promise<Record<string, unknown>> => {
          return {
            id: 'internal-id',
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(null)
    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (): Promise<Record<string, unknown>> => {
          return {
            publicKey: [],
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(null)

    expect(
      await PublicIdentity.resolveFromDid('did:kilt:3', {} as IURLResolver)
    ).toEqual(null)
  })
})

/**
 * @packageDocumentation
 * @group unit/identity
 * @ignore
 */

import { U8aFixed } from '@polkadot/types'
import TYPE_REGISTRY, {
  mockChainQueryReturn,
} from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import IPublicIdentity from '../types/PublicIdentity'
import PublicIdentity, { IURLResolver } from './PublicIdentity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('PublicIdentity', () => {
  const pubKey = new U8aFixed(TYPE_REGISTRY, 'pub-key', 256)
  const boxKey = new U8aFixed(TYPE_REGISTRY, 'box-key', 256)

  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.did.dIDs = jest.fn(
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

import { Text, Tuple } from '@polkadot/types'
import PublicIdentity, { IURLResolver } from './PublicIdentity'
import IPublicIdentity from '../types/PublicIdentity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('PublicIdentity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should resolve internal and external dids', async () => {
    require('../blockchain/Blockchain').default.__mockQueryDidDids = jest.fn(
      id => {
        const tuple =
          id === '1'
            ? new Tuple(
                // (root-id, parent-id?, account, permissions, revoked)
                [Text, Text, Text],
                ['pub-key', 'box-key', '0x80001f']
              )
            : id === '2'
            ? new Tuple(
                // (root-id, parent-id?, account, permissions, revoked)
                [Text, Text, Text],
                ['pub-key', 'box-key', undefined]
              )
            : undefined
        return Promise.resolve(tuple)
      }
    )

    const externalPubId:
      | IPublicIdentity
      | undefined = await PublicIdentity.resolveFromDid('did:sov:1', {
      resolve: async (url: string): Promise<object> => {
        return {
          didDocument: {
            id: 'external-id',
            publicKey: [
              {
                id: 'extenal-id#key-1',
                type: 'X25519Salsa20Poly1305Key2018',
                publicKeyHex: 'external-box-key',
              },
            ],
            service: [
              {
                id: 'extenal-id#service-1',
                type: 'KiltMessagingService',
                serviceEndpoint: 'external-service-address',
              },
            ],
          },
        }
      },
    } as IURLResolver)
    expect(externalPubId).toEqual({
      address: 'external-id',
      boxPublicKeyAsHex: 'external-box-key',
      serviceAddress: 'external-service-address',
    })

    const internalPubId:
      | IPublicIdentity
      | undefined = await PublicIdentity.resolveFromDid('did:kilt:1', {
      resolve: async (url: string): Promise<object> => {
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
    } as IURLResolver)
    expect(internalPubId).toEqual({
      address: 'internal-id',
      boxPublicKeyAsHex: 'internal-box-key',
      serviceAddress: 'internal-service-address',
    })

    const bcOnleyubId:
      | IPublicIdentity
      | undefined = await PublicIdentity.resolveFromDid(
      'did:kilt:2',
      {} as IURLResolver
    )
    expect(bcOnleyubId).toEqual({
      address: '2',
      boxPublicKeyAsHex: 'box-key',
      serviceAddress: undefined,
    })

    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (url: string): Promise<object> => {
          return {
            id: 'internal-id',
            publicKey: [],
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(undefined)
    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (url: string): Promise<object> => {
          return {
            id: 'internal-id',
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(undefined)
    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (url: string): Promise<object> => {
          return {
            publicKey: [],
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(undefined)

    expect(
      await PublicIdentity.resolveFromDid('did:kilt:3', {} as IURLResolver)
    ).toEqual(undefined)
  })
})

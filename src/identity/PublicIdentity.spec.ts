import { Text, Tuple, U8a } from '@polkadot/types'
import PublicIdentity, { IURLResolver } from './PublicIdentity'
import IPublicIdentity from '../types/PublicIdentity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('PublicIdentity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts

  require('../blockchain/Blockchain').default.__mockQueryDidDids = jest.fn(
    id => {
      let tuple
      switch (id) {
        case '1':
          tuple = new Tuple(
            // (public-signing-key, public-encryption-key, did-reference?)
            [Text, Text, U8a],
            ['pub-key', 'box-key', [14, 75, 23, 14, 55]]
          )
          break
        case '2':
          tuple = new Tuple(
            // (public-signing-key, public-encryption-key, did-reference?)
            [Text, Text, Text],
            ['pub-key', 'box-key', undefined]
          )
          break
        default:
          tuple = undefined
      }
      return Promise.resolve(tuple)
    }
  )

  it('should resolve external dids', async () => {
    const externalPubId: IPublicIdentity | null = await PublicIdentity.resolveFromDid(
      'did:sov:1',
      {
        resolve: async (): Promise<object> => {
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
        resolve: async (): Promise<object> => {
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

    const bcOnleyubId: IPublicIdentity | null = await PublicIdentity.resolveFromDid(
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
        resolve: async (): Promise<object> => {
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
        resolve: async (): Promise<object> => {
          return {
            id: 'internal-id',
            service: [],
          }
        },
      } as IURLResolver)
    ).toEqual(null)
    expect(
      await PublicIdentity.resolveFromDid('did:kilt:1', {
        resolve: async (): Promise<object> => {
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

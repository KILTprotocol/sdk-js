import { Tuple, Option, H256 } from '@polkadot/types'
import PublicIdentity, { IURLResolver } from './PublicIdentity'
import IPublicIdentity from '../types/PublicIdentity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const pubKey = new H256('pub-key')
const boxKey = new H256('box-key')

describe('PublicIdentity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts

  require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.did.dIDs = jest.fn(
    async id => {
      switch (id) {
        case '1':
          return new Option(
            Tuple.with(
              // (public-signing-key, public-encryption-key, did-reference?)
              [H256, H256, 'Option<Bytes>']
            ),
            [pubKey, boxKey, [14, 75, 23, 14, 55]]
          )
        case '2':
          return new Option(
            Tuple.with(
              // (public-signing-key, public-encryption-key, did-reference?)
              [H256, H256, 'Option<Bytes>']
            ),
            [pubKey, boxKey, undefined]
          )

        default:
          return new Option(Tuple.with([H256, H256, 'Option<Bytes>']))
      }
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

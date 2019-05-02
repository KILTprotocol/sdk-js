import { Text, Tuple, Option } from '@polkadot/types'
import { Blockchain, Did } from '../'
import { IDid } from './Did'
import Identity from '../identity/Identity'

describe('DID', () => {
  // @ts-ignore
  const blockchain = {
    api: {
      tx: {
        did: {
          add: jest.fn((sign_key, box_key, doc_ref) => {
            return Promise.resolve()
          }),
          remove: jest.fn(() => {
            return Promise.resolve()
          }),
        },
      },
      query: {
        dID: {
          dIDs: jest.fn(address => {
            if (address === 'withDocumentStore') {
              const tuple = new Tuple(
                // (publicBoxKey, publicSigningKey, documentStore?)
                [Text, Text, Text],
                ['0x987', '0x123', '0x687474703a2f2f6d794449442e6b696c742e696f']
              )
              return Promise.resolve(tuple)
            } else {
              const tuple = new Tuple(
                // (publicBoxKey, publicSigningKey, documentStore?)
                [Text, Text, Option],
                ['0x987', '0x123', null]
              )
              return Promise.resolve(tuple)
            }
          }),
        },
      },
    },
    submitTx: jest.fn((identity, tx) => {
      return Promise.resolve({ status: 'ok' })
    }),
    getNonce: jest.fn(),
  } as Blockchain

  it('query by address with documentStore', async () => {
    const did = await Did.queryByAddress(blockchain, 'withDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:withDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: 'http://myDID.kilt.io',
    } as IDid)
  })

  it('query by address w/o documentStore', async () => {
    const did = await Did.queryByAddress(blockchain, 'w/oDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: undefined,
    } as IDid)
  })

  it('query by identifier w/o documentStore', async () => {
    const did = await Did.queryByIdentifier(
      blockchain,
      'did:kilt:w/oDocumentStore'
    )
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: undefined,
    } as IDid)
  })

  it('query by identifier invalid identifier', async () => {
    try {
      await Did.queryByIdentifier(blockchain, 'invalidIdentifier')
      fail('should have detected an invalid DID')
    } catch (err) {
      expect(true).toBe(true)
    }
  })

  it('store did', async () => {
    const alice = Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(alice, 'http://myDID.kilt.io')
    expect(await did.store(blockchain, alice)).toEqual({ status: 'ok' })
  })

  it('get default did document', async () => {
    const did = Did.fromIdentity(
      Identity.buildFromURI('//Alice'),
      'http://myDID.kilt.io'
    )
    expect(did.getDefaultDocument('http://myDID.kilt.io/service')).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: {
        publicKey: [
          'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TmTd#key-1',
        ],
        type: 'Ed25519SignatureAuthentication2018',
      },
      id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TmTd',
      publicKey: [
        {
          controller:
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TmTd',
          id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TmTd#key-1',
          publicKeyHex:
            '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TmTd',
          id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TmTd#key-2',
          publicKeyHex:
            '0xe54bdd5e4f0929471fb333b17c0d865fc4f2cbc45364602bd1b85550328c3c62',
          type: 'X25519Salsa20Poly1305Key2018',
        },
      ],
      service: [
        {
          serviceEndpoint: 'http://myDID.kilt.io/service',
          type: 'KiltMessagingService',
        },
      ],
    })
  })
})

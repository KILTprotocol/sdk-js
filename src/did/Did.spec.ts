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
    const alice = Identity.buildFromSeedString('Alice')
    const did = Did.fromIdentity(alice, 'http://myDID.kilt.io')
    expect(await did.store(blockchain, alice)).toEqual({ status: 'ok' })
  })

  it('get default did document', async () => {
    const did = Did.fromIdentity(
      Identity.buildFromSeedString('Alice'),
      'http://myDID.kilt.io'
    )
    expect(did.getDefaultDocument('http://myDID.kilt.io/service')).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: {
        publicKey: [
          'did:kilt:5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ#key-1',
        ],
        type: 'Ed25519SignatureAuthentication2018',
      },
      id: 'did:kilt:5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ',
      publicKey: [
        {
          controller:
            'did:kilt:5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ',
          id: 'did:kilt:5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ#key-1',
          publicKeyHex:
            '0xd172a74cda4c865912c32ba0a80a57ae69abae410e5ccb59dee84e2f4432db4f',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ',
          id: 'did:kilt:5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ#key-2',
          publicKeyHex:
            '0xd895ac3d67820ad8a53f76384cea3f5f950c7c71c623fcf75154bfa6ce35ed18',
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

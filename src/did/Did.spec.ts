import { Text, Tuple, Option, U8a } from '@polkadot/types'
import { Did } from '..'
import { IDid } from './Did'
import Identity from '../identity/Identity'
import { getIdentifierFromAddress } from './Did.utils'
import { OK } from '../const/TxStatus'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('DID', () => {
  require('../blockchain/Blockchain').default.__mockQueryDidDids = jest.fn(
    address => {
      if (address === 'withDocumentStore') {
        const tuple = new Option(
          Tuple,
          new Tuple(
            // (publicBoxKey, publicSigningKey, documentStore?)
            [Text, Text, U8a],
            ['0x987', '0x123', '0x687474703a2f2f6d794449442e6b696c742e696f']
          )
        )
        return Promise.resolve(tuple)
      }
      const tuple = new Option(
        Tuple,
        new Tuple(
          // (publicBoxKey, publicSigningKey, documentStore?)
          [Text, Text, Option],
          ['0x987', '0x123', null]
        )
      )
      return Promise.resolve(tuple)
    }
  )
  require('../blockchain/Blockchain').default.submitTx = jest.fn(() => {
    return Promise.resolve({ status: OK })
  })

  it('query by address with documentStore', async () => {
    const did = await Did.queryByAddress('withDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:withDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: 'http://myDID.kilt.io',
    } as IDid)
  })

  it('query by address w/o documentStore', async () => {
    const did = await Did.queryByAddress('w/oDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: null,
    } as IDid)
  })

  it('query by identifier w/o documentStore', async () => {
    const did = await Did.queryByIdentifier('did:kilt:w/oDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: null,
    } as IDid)
  })

  it('query by identifier invalid identifier', async done => {
    try {
      await Did.queryByIdentifier('invalidIdentifier')
      done.fail('should have detected an invalid DID')
    } catch (err) {
      done()
    }
  })

  it('store did', async () => {
    const alice = await Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(alice, 'http://myDID.kilt.io')
    expect(await did.store(alice)).toEqual({ status: OK })
  })

  it('creates default did document', async () => {
    const did = Did.fromIdentity(
      await Identity.buildFromURI('//Alice'),
      'http://myDID.kilt.io'
    )
    expect(
      did.createDefaultDidDocument('http://myDID.kilt.io/service')
    ).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: {
        publicKey: [
          'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M#key-1',
        ],
        type: 'Ed25519SignatureAuthentication2018',
      },
      id: 'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M',
      publicKey: [
        {
          controller:
            'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M',
          id: 'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M#key-1',
          publicKeyHex:
            '0x4acb9bc1db9af5512d91da6461e362ebf0e6500f5ee36d39adc476e2558f9477',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M',
          id: 'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M#key-2',
          publicKeyHex:
            '0xbd0f0e4b81ecf1644026498ff657ce7aa0101511e913464f22ea415961a32c34',
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

  it('creates default did document (static)', async () => {
    const alice = await Identity.buildFromURI('//Alice')
    expect(
      Did.createDefaultDidDocument(
        Did.getIdentifierFromAddress(alice.getAddress()),
        alice.getBoxPublicKey(),
        alice.signPublicKeyAsHex,
        'http://myDID.kilt.io/service'
      )
    ).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: {
        publicKey: [
          'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M#key-1',
        ],
        type: 'Ed25519SignatureAuthentication2018',
      },
      id: 'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M',
      publicKey: [
        {
          controller:
            'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M',
          id: 'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M#key-1',
          publicKeyHex:
            '0x4acb9bc1db9af5512d91da6461e362ebf0e6500f5ee36d39adc476e2558f9477',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M',
          id: 'did:kilt:5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M#key-2',
          publicKeyHex:
            '0xbd0f0e4b81ecf1644026498ff657ce7aa0101511e913464f22ea415961a32c34',
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

  it('verifies the did document signature (untampered data)', async () => {
    const identity = await Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(
      await Identity.buildFromURI('//Alice'),
      'http://myDID.kilt.io'
    )
    const didDocument = did.createDefaultDidDocument(
      'http://myDID.kilt.io/service'
    )
    const signedDidDocument = Did.signDidDocument(didDocument, identity)
    expect(
      Did.verifyDidDocumentSignature(
        signedDidDocument,
        getIdentifierFromAddress(identity.getAddress())
      )
    ).toBeTruthy()
  })

  it('verifies the did document signature (tampered data)', async () => {
    const identity = await Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(identity, 'http://myDID.kilt.io')
    const didDocument = did.createDefaultDidDocument(
      'http://myDID.kilt.io/service'
    )
    const signedDidDocument = Did.signDidDocument(didDocument, identity)
    const tamperedSignedDidDocument = {
      ...signedDidDocument,
      authentication: {
        type: 'Ed25519SignatureAuthentication2018',
        publicKey: ['did:kilt:123'],
      },
    }
    expect(
      Did.verifyDidDocumentSignature(
        tamperedSignedDidDocument,
        getIdentifierFromAddress(identity.getAddress())
      )
    ).toBeFalsy()
  })

  it("throws when verifying the did document signature if identifiers don't match", async () => {
    const identityAlice = await Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(identityAlice, 'http://myDID.kilt.io')
    const didDocument = did.createDefaultDidDocument(
      'http://myDID.kilt.io/service'
    )
    const signedDidDocument = Did.signDidDocument(didDocument, identityAlice)
    const identityBob = await Identity.buildFromURI('//Bob')
    const id = getIdentifierFromAddress(identityBob.getAddress())

    expect(() => {
      Did.verifyDidDocumentSignature(signedDidDocument, id)
    }).toThrowError(
      new Error(
        `This identifier (${id}) doesn't match the DID Document's identifier (${signedDidDocument.id})`
      )
    )
  })

  it('gets identifier from address', () => {
    expect(
      Did.getIdentifierFromAddress(
        '5F59aUtyDc54Sx2yA1hHgncBErSPWRAt5SgQXvPjVNEMPCqY'
      )
    ).toBe('did:kilt:5F59aUtyDc54Sx2yA1hHgncBErSPWRAt5SgQXvPjVNEMPCqY')
  })

  it('gets address from identifier', () => {
    expect(
      Did.getAddressFromIdentifier(
        'did:kilt:5F59aUtyDc54Sx2yA1hHgncBErSPWRAt5SgQXvPjVNEMPCqY'
      )
    ).toBe('5F59aUtyDc54Sx2yA1hHgncBErSPWRAt5SgQXvPjVNEMPCqY')
  })
})

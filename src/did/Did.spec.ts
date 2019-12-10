import { Text, Tuple, Option, U8a } from '@polkadot/types'
import { Did } from '..'
import { IDid } from './Did'
import Identity from '../identity/Identity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('DID', () => {
  require('../blockchain/Blockchain').default.__mockQueryDidDids = jest.fn(
    address => {
      if (address === 'withDocumentStore') {
        const tuple = new Tuple(
          // (publicBoxKey, publicSigningKey, documentStore?)
          [Text, Text, U8a],
          ['0x987', '0x123', '0x687474703a2f2f6d794449442e6b696c742e696f']
        )
        return Promise.resolve(tuple)
      }
      const tuple = new Tuple(
        // (publicBoxKey, publicSigningKey, documentStore?)
        [Text, Text, Option],
        ['0x987', '0x123', null]
      )
      return Promise.resolve(tuple)
    }
  )
  require('../blockchain/Blockchain').default.submitTx = jest.fn(() => {
    return Promise.resolve({ status: 'ok' })
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
    const alice = Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(alice, 'http://myDID.kilt.io')
    expect(await did.store(alice)).toEqual({ status: 'ok' })
  })

  it('creates default did document', async () => {
    const did = Did.fromIdentity(
      Identity.buildFromURI('//Alice'),
      'http://myDID.kilt.io'
    )
    expect(
      did.createDefaultDidDocument('http://myDID.kilt.io/service')
    ).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: {
        publicKey: [
          'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-1',
        ],
        type: 'Ed25519SignatureAuthentication2018',
      },
      id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
      publicKey: [
        {
          controller:
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
          id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-1',
          publicKeyHex:
            '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
          id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-2',
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

  it('creates signed default did document from identity', () => {
    const identity = Identity.buildFromURI('//Alice')
    expect(
      Did.createDefaultDidDocumentSignedFromIdentity(
        identity,
        'http://myDID.kilt.io/service'
      )
    ).toEqual({
      id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
      '@context': 'https://w3id.org/did/v1',
      authentication: {
        type: 'Ed25519SignatureAuthentication2018',
        publicKey: [
          'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-1',
        ],
      },
      publicKey: [
        {
          controller:
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
          id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-1',
          publicKeyHex:
            '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
          id: 'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-2',
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
      signature:
        '0xc1e24605bc58707e220ad760ba4c18a2b45b65c59731ba9ea1a83933afc67feb4f8f7107cf75b3189dd17617df29af26e55f19eb826e794ab3bdc7d375a3df0b',
    })
  })

  it('verifies the did document signature (untampered data)', () => {
    const identity = Identity.buildFromURI('//Alice')
    const signedDidDoc = Did.createDefaultDidDocumentSignedFromIdentity(
      identity,
      'http://myDID.kilt.io/service'
    )
    expect(
      Did.verifyDidDocumentSignature(signedDidDoc, identity.address)
    ).toBeTruthy()
  })

  it('verifies the did document signature (tampered data)', () => {
    const identity = Identity.buildFromURI('//Alice')
    const signedDidDoc = Did.createDefaultDidDocumentSignedFromIdentity(
      identity,
      'http://myDID.kilt.io/service'
    )
    const tamperedSignedDidDoc = {
      ...signedDidDoc,
      authentication: {
        type: 'Ed25519SignatureAuthentication2018',
        publicKey: ['did:kilt:123'],
      },
    }
    expect(
      Did.verifyDidDocumentSignature(tamperedSignedDidDoc, identity.address)
    ).toBeFalsy()
  })

  it("throws when verifying the did document signature if addresses don't match", () => {
    const identityAlice = Identity.buildFromURI('//Alice')
    const identityBob = Identity.buildFromURI('//Bob')
    const signedDidDoc = Did.createDefaultDidDocumentSignedFromIdentity(
      identityAlice,
      'http://myDID.kilt.io/service'
    )
    expect(() => {
      Did.verifyDidDocumentSignature(signedDidDoc, identityBob.address)
    }).toThrowError(
      new Error(
        `The input address ${Did.getAddressFromIdentifier(
          signedDidDoc.id
        )} doesn't match the DID Document's address ${identityBob.address}`
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

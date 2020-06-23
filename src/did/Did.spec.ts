import { Option, Tuple, TypeRegistry, U8aFixed } from '@polkadot/types'
import { Did, IDid } from '..'
import { ERROR_DID_IDENTIFIER_MISMATCH } from '../errorhandling/SDKErrors'
import Identity from '../identity/Identity'
import {
  getIdentifierFromAddress,
  verifyDidDocumentSignature,
} from './Did.utils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('DID', () => {
  const registry = new TypeRegistry()

  // TODO: Delete this note before merging and use as PR comment
  // H256 class was deprecated in 1.4.1
  // Constructor was exactly what can be found below
  // See https://github.com/polkadot-js/api/compare/v1.3.1...1.4.1#diff-43e6848b127cb59299114e36a27f8717L16
  // See https://github.com/polkadot-js/api/blob/master/packages/types/src/codec/U8aFixed.ts#L45
  const key1 = new U8aFixed(registry, 'box-me', 256)
  const key2 = new U8aFixed(registry, 'sign-me', 256)

  require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.did.dIDs.mockImplementation(
    async (address: string) => {
      if (address === 'withDocumentStore') {
        return new Option(
          registry,
          Tuple.with(
            // (publicBoxKey, publicSigningKey, documentStore?)
            ['H256', 'H256', 'Option<Bytes>']
          ),
          [key2, key1, '0x687474703a2f2f6d794449442e6b696c742e696f']
        )
      }
      return new Option(
        registry,
        Tuple.with(
          // (publicBoxKey, publicSigningKey, documentStore?)+
          ['H256', 'H256', 'Option<Bytes>']
        ),
        [key1, key2, null]
      )
    }
  )

  it('query by address with documentStore', async () => {
    const did = await Did.queryByAddress('withDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:withDocumentStore',
      publicBoxKey: key1.toString(),
      publicSigningKey: key2.toString(),
      documentStore: 'http://myDID.kilt.io',
    } as IDid)
  })

  it('query by address w/o documentStore', async () => {
    const did = await Did.queryByAddress('w/oDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: key2.toString(),
      publicSigningKey: key1.toString(),
      documentStore: null,
    } as IDid)
  })

  it('query by identifier w/o documentStore', async () => {
    const did = await Did.queryByIdentifier('did:kilt:w/oDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: key2.toString(),
      publicSigningKey: key1.toString(),
      documentStore: null,
    } as IDid)
  })

  it('query by identifier invalid identifier', async (done) => {
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
    await expect(did.store(alice)).resolves.toHaveProperty('isFinalized', true)
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
      authentication: [
        {
          publicKey: [
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-1',
          ],
          type: 'Ed25519SignatureAuthentication2018',
        },
      ],
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
      authentication: [
        {
          publicKey: [
            'did:kilt:5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu#key-1',
          ],
          type: 'Ed25519SignatureAuthentication2018',
        },
      ],
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
      authentication: [
        {
          type: 'Ed25519SignatureAuthentication2018',
          publicKey: ['did:kilt:123'],
        },
      ],
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

    expect(() =>
      verifyDidDocumentSignature(signedDidDocument, id)
    ).toThrowError(ERROR_DID_IDENTIFIER_MISMATCH(id, signedDidDocument.id))
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

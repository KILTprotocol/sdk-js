/**
 * @group unit/did
 */

import { U8aFixed } from '@polkadot/types'
import { SDKErrors } from '@kiltprotocol/utils'
import TYPE_REGISTRY, {
  mockChainQueryReturn,
} from '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { Did, IDid } from '..'
import Identity from '../identity/Identity'
import {
  getIdentifierFromAddress,
  verifyDidDocumentSignature,
} from './Did.utils'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

describe('DID', () => {
  const key1 = new U8aFixed(TYPE_REGISTRY, 'box-me', 256)
  const key2 = new U8aFixed(TYPE_REGISTRY, 'sign-me', 256)
  Kilt.config({ address: 'ws://testString' })
  const blockchainApi = require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  beforeAll(() => {
    blockchainApi.query.did.dIDs.mockImplementation(async (address: string) => {
      if (address === 'withDocumentStore') {
        return mockChainQueryReturn('did', 'dIDs', [
          key2,
          key1,
          '0x687474703a2f2f6d794449442e6b696c742e696f',
        ])
      }
      return mockChainQueryReturn('did', 'dIDs', [key1, key2, null])
    })
  })

  it('query by address with documentStore', async () => {
    blockchainApi.query.did.dIDs.mockReturnValueOnce(
      mockChainQueryReturn('did', 'dIDs', [
        key2,
        key1,
        '0x687474703a2f2f6d794449442e6b696c742e696f',
      ])
    )
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

  it('query by identifier invalid identifier', async () => {
    const identifier = 'invalidIdentifier'
    await expect(Did.queryByIdentifier(identifier)).rejects.toThrow(
      SDKErrors.ERROR_INVALID_DID_PREFIX(identifier)
    )
  })

  it('store did', async () => {
    const alice = Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(alice, 'http://myDID.kilt.io')
    const tx = await did.store(alice)
    await expect(
      BlockchainUtils.submitTxWithReSign(tx, alice)
    ).resolves.toHaveProperty('isFinalized', true)
  })

  it('creates default did document', async () => {
    const did = Did.fromIdentity(
      Identity.buildFromURI('//Alice', { signingKeyPairType: 'ed25519' }),
      'http://myDID.kilt.io'
    )
    expect(
      did.createDefaultDidDocument('http://myDID.kilt.io/service')
    ).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: [
        {
          publicKey: [
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key-1',
          ],
          type: 'Ed25519SignatureAuthentication2018',
        },
      ],
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKey: [
        {
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key-1',
          publicKeyHex:
            '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key-2',
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
    const alice = Identity.buildFromURI('//Alice', {
      signingKeyPairType: 'ed25519',
    })
    expect(
      Did.createDefaultDidDocument(
        Did.getIdentifierFromAddress(alice.address),
        alice.getBoxPublicKey(),
        alice.signPublicKeyAsHex,
        'http://myDID.kilt.io/service'
      )
    ).toEqual({
      '@context': 'https://w3id.org/did/v1',
      authentication: [
        {
          publicKey: [
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key-1',
          ],
          type: 'Ed25519SignatureAuthentication2018',
        },
      ],
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKey: [
        {
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key-1',
          publicKeyHex:
            '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee',
          type: 'Ed25519VerificationKey2018',
        },
        {
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key-2',
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
    const identity = Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(
      Identity.buildFromURI('//Alice'),
      'http://myDID.kilt.io'
    )
    const didDocument = did.createDefaultDidDocument(
      'http://myDID.kilt.io/service'
    )
    const signedDidDocument = Did.signDidDocument(didDocument, identity)
    expect(
      Did.verifyDidDocumentSignature(
        signedDidDocument,
        getIdentifierFromAddress(identity.address)
      )
    ).toBeTruthy()
  })

  it('verifies the did document signature (tampered data)', async () => {
    const identity = Identity.buildFromURI('//Alice')
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
        getIdentifierFromAddress(identity.address)
      )
    ).toBeFalsy()
  })

  it("throws when verifying the did document signature if identifiers don't match", async () => {
    const identityAlice = Identity.buildFromURI('//Alice')
    const did = Did.fromIdentity(identityAlice, 'http://myDID.kilt.io')
    const didDocument = did.createDefaultDidDocument(
      'http://myDID.kilt.io/service'
    )
    const signedDidDocument = Did.signDidDocument(didDocument, identityAlice)
    const identityBob = Identity.buildFromURI('//Bob')
    const id = getIdentifierFromAddress(identityBob.address)

    expect(() =>
      verifyDidDocumentSignature(signedDidDocument, id)
    ).toThrowError(
      SDKErrors.ERROR_DID_IDENTIFIER_MISMATCH(id, signedDidDocument.id)
    )
  })

  it('gets identifier from address', () => {
    expect(
      Did.getIdentifierFromAddress(
        '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      )
    ).toBe('did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs')
  })

  it('gets address from identifier', () => {
    expect(
      Did.getAddressFromIdentifier(
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      )
    ).toBe('4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs')
  })
})

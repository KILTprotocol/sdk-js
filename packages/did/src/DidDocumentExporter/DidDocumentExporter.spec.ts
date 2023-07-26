/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'

import type {
  DidServiceEndpoint,
  NewDidVerificationKey,
  DidDocument,
  DidVerificationKey,
  DidEncryptionKey,
  UriFragment,
  DidUri,
} from '@kiltprotocol/types'

import { exportToDidDocument } from './DidDocumentExporter.js'
import * as Did from '../index.js'
import { KILT_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from '../index.js'

const did: DidUri = 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'

function generateAuthenticationKey(): DidVerificationKey {
  return {
    id: '#auth',
    type: 'ed25519',
    publicKey: new Uint8Array(32).fill(0),
  }
}

function generateEncryptionKey(): DidEncryptionKey {
  return {
    id: '#enc',
    type: 'x25519',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(15),
  }
}

function generateAttestationKey(): DidVerificationKey {
  return {
    id: '#att',
    type: 'sr25519',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(20),
  }
}

function generateDelegationKey(): DidVerificationKey {
  return {
    id: '#del',
    type: 'ecdsa',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(25),
  }
}

function generateServiceEndpoint(serviceId: UriFragment): DidServiceEndpoint {
  const fragment = Did.resourceIdToChain(serviceId)
  return {
    id: serviceId,
    type: [`type-${fragment}`],
    serviceEndpoint: [`x:url-${fragment}`],
  }
}

const fullDid: DidDocument = {
  uri: did,
  authentication: [generateAuthenticationKey()],
  keyAgreement: [generateEncryptionKey()],
  assertionMethod: [generateAttestationKey()],
  capabilityDelegation: [generateDelegationKey()],
  service: [generateServiceEndpoint('#id-1'), generateServiceEndpoint('#id-2')],
}

describe('When exporting a DID Document from a full DID', () => {
  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(fullDid, 'application/json')

    expect(didDoc).toStrictEqual({
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      verificationMethod: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
      ],
      authentication: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
      ],
      keyAgreement: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
      ],
      assertionMethod: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
      ],
      capabilityDelegation: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
      ],
      service: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-1',
          type: ['type-id-1'],
          serviceEndpoint: ['x:url-id-1'],
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-2',
          type: ['type-id-2'],
          serviceEndpoint: ['x:url-id-2'],
        },
      ],
    })
  })

  it('exports the expected application/ld+json W3C DID Document with an Ed25519 authentication key, two x25519 encryption keys, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(fullDid, 'application/ld+json')

    expect(didDoc).toStrictEqual({
      '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      verificationMethod: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
      ],
      authentication: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
      ],
      keyAgreement: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
      ],
      assertionMethod: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
      ],
      capabilityDelegation: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
      ],
      service: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-1',
          type: ['type-id-1'],
          serviceEndpoint: ['x:url-id-1'],
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-2',
          type: ['type-id-2'],
          serviceEndpoint: ['x:url-id-2'],
        },
      ],
    })
  })

  it('fails to export to an unsupported mimetype', async () => {
    expect(() =>
      // @ts-ignore
      exportToDidDocument(fullDid, 'random-mime-type')
    ).toThrow()
  })
})

describe('When exporting a DID Document from a light DID', () => {
  const authKey = generateAuthenticationKey() as NewDidVerificationKey
  const encKey = generateEncryptionKey()
  const service = [
    generateServiceEndpoint('#id-1'),
    generateServiceEndpoint('#id-2'),
  ]
  const lightDid = Did.createLightDidDocument({
    authentication: [{ publicKey: authKey.publicKey, type: 'ed25519' }],
    keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
    service,
  })

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(lightDid, 'application/json')

    expect(didDoc).toMatchInlineSnapshot(`
      {
        "authentication": [
          "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#authentication",
        ],
        "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
        "keyAgreement": [
          "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#encryption",
        ],
        "service": [
          {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-1",
            "serviceEndpoint": [
              "x:url-id-1",
            ],
            "type": [
              "type-id-1",
            ],
          },
          {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-2",
            "serviceEndpoint": [
              "x:url-id-2",
            ],
            "type": [
              "type-id-2",
            ],
          },
        ],
        "verificationMethod": [
          {
            "controller": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#authentication",
            "publicKeyBase58": "11111111111111111111111111111111",
            "type": "Ed25519VerificationKey2018",
          },
          {
            "controller": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#encryption",
            "publicKeyBase58": "11111111111111111111111111111111",
            "type": "X25519KeyAgreementKey2019",
          },
        ],
      }
    `)
  })

  it('exports the expected application/json+ld W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(lightDid, 'application/ld+json')

    expect(didDoc).toMatchInlineSnapshot(`
      {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "ipfs://QmU7QkuTCPz7NmD5bD7Z7mQVz2UsSPaEK58B5sYnjnPRNW",
        ],
        "authentication": [
          "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#authentication",
        ],
        "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
        "keyAgreement": [
          "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#encryption",
        ],
        "service": [
          {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-1",
            "serviceEndpoint": [
              "x:url-id-1",
            ],
            "type": [
              "type-id-1",
            ],
          },
          {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-2",
            "serviceEndpoint": [
              "x:url-id-2",
            ],
            "type": [
              "type-id-2",
            ],
          },
        ],
        "verificationMethod": [
          {
            "controller": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#authentication",
            "publicKeyBase58": "11111111111111111111111111111111",
            "type": "Ed25519VerificationKey2018",
          },
          {
            "controller": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#encryption",
            "publicKeyBase58": "11111111111111111111111111111111",
            "type": "X25519KeyAgreementKey2019",
          },
        ],
      }
    `)
  })

  it('fails to export to an unsupported mimetype', async () => {
    expect(() =>
      // @ts-ignore
      exportToDidDocument(lightDid, 'random-mime-type')
    ).toThrow()
  })
})

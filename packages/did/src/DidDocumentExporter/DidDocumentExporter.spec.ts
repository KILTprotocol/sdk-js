/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'

import {
  DidServiceEndpoint,
  DidIdentifier,
  NewDidVerificationKey,
  DidDetails,
  DidVerificationKey,
  DidEncryptionKey,
  UriFragment,
  DidUri,
} from '@kiltprotocol/types'

import type { IDidChainRecord } from '../Did.chain.js'
import { exportToDidDocument } from './DidDocumentExporter.js'
import * as Did from '../index.js'
import { stripFragment } from '../Did.utils'

/**
 * @group unit/did
 */

const did: DidUri = 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'

function generateAuthenticationKeyDetails(): DidVerificationKey {
  return {
    id: '#auth',
    type: 'ed25519',
    publicKey: new Uint8Array(32).fill(0),
  }
}

function generateEncryptionKeyDetails(): DidEncryptionKey {
  return {
    id: '#enc',
    type: 'x25519',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(15),
  }
}

function generateAttestationKeyDetails(): DidVerificationKey {
  return {
    id: '#att',
    type: 'sr25519',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(20),
  }
}

function generateDelegationKeyDetails(): DidVerificationKey {
  return {
    id: '#del',
    type: 'ecdsa',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(25),
  }
}

function generateServiceEndpointDetails(
  serviceId: UriFragment
): DidServiceEndpoint {
  const fragment = stripFragment(serviceId)
  return {
    id: serviceId,
    type: [`type-${fragment}`],
    serviceEndpoint: [`x:url-${fragment}`],
  }
}

jest.mock('../Did.chain', () => {
  const queryDetails = jest.fn(
    async (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      didIdentifier: DidIdentifier
    ): Promise<IDidChainRecord | null> => {
      const authKey = generateAuthenticationKeyDetails()
      const encKey = generateEncryptionKeyDetails()
      const attKey = generateAttestationKeyDetails()
      const delKey = generateDelegationKeyDetails()

      return {
        authentication: [authKey],
        keyAgreement: [encKey],
        assertionMethod: [attKey],
        capabilityDelegation: [delKey],
        lastTxCounter: new BN(0),
        deposit: {
          amount: new BN(2),
          owner: Did.Utils.getAddressFromIdentifier(didIdentifier),
        },
      }
    }
  )
  const queryServiceEndpoint = jest.fn(
    async (
      didIdentifier: DidIdentifier,
      serviceId: DidServiceEndpoint['id']
    ): Promise<DidServiceEndpoint | null> =>
      generateServiceEndpointDetails(serviceId)
  )
  const queryServiceEndpoints = jest.fn(
    async (didIdentifier: DidIdentifier): Promise<DidServiceEndpoint[]> => [
      (await queryServiceEndpoint(
        didIdentifier,
        '#id-1'
      )) as DidServiceEndpoint,
      (await queryServiceEndpoint(
        didIdentifier,
        '#id-2'
      )) as DidServiceEndpoint,
    ]
  )
  return {
    queryDetails,
    queryServiceEndpoint,
    queryServiceEndpoints,
  }
})

describe('When exporting a DID Document from a full DID', () => {
  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', async () => {
    const fullDidDetails = (await Did.query(did)) as DidDetails

    const didDoc = exportToDidDocument(fullDidDetails, 'application/json')

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
      authentication: ['#auth'],
      keyAgreement: ['#enc'],
      assertionMethod: ['#att'],
      capabilityDelegation: ['#del'],
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
    const fullDidDetails = (await Did.query(did)) as DidDetails

    const didDoc = exportToDidDocument(fullDidDetails, 'application/ld+json')

    expect(didDoc).toStrictEqual({
      '@context': ['https://www.w3.org/ns/did/v1'],
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
      authentication: ['#auth'],
      keyAgreement: ['#enc'],
      assertionMethod: ['#att'],
      capabilityDelegation: ['#del'],
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
    const fullDidDetails = (await Did.query(did)) as DidDetails

    expect(() =>
      // @ts-ignore
      exportToDidDocument(fullDidDetails, 'random-mime-type')
    ).toThrow()
  })
})

describe('When exporting a DID Document from a light DID', () => {
  const authKey = generateAuthenticationKeyDetails() as NewDidVerificationKey
  const encKey = generateEncryptionKeyDetails()
  const service = [
    generateServiceEndpointDetails('#id-1'),
    generateServiceEndpointDetails('#id-2'),
  ]
  const lightDidDetails = Did.createDetails({
    authentication: [{ publicKey: authKey.publicKey, type: 'ed25519' }],
    keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
    service,
  })

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(lightDidDetails, 'application/json')

    expect(didDoc).toMatchInlineSnapshot(`
      Object {
        "authentication": Array [
          "#authentication",
        ],
        "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
        "keyAgreement": Array [
          "#encryption",
        ],
        "service": Array [
          Object {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-1",
            "serviceEndpoint": Array [
              "x:url-id-1",
            ],
            "type": Array [
              "type-id-1",
            ],
          },
          Object {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-2",
            "serviceEndpoint": Array [
              "x:url-id-2",
            ],
            "type": Array [
              "type-id-2",
            ],
          },
        ],
        "verificationMethod": Array [
          Object {
            "controller": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#authentication",
            "publicKeyBase58": "11111111111111111111111111111111",
            "type": "Ed25519VerificationKey2018",
          },
          Object {
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
    const didDoc = exportToDidDocument(lightDidDetails, 'application/ld+json')

    expect(didDoc).toMatchInlineSnapshot(`
      Object {
        "@context": Array [
          "https://www.w3.org/ns/did/v1",
        ],
        "authentication": Array [
          "#authentication",
        ],
        "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
        "keyAgreement": Array [
          "#encryption",
        ],
        "service": Array [
          Object {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-1",
            "serviceEndpoint": Array [
              "x:url-id-1",
            ],
            "type": Array [
              "type-id-1",
            ],
          },
          Object {
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#id-2",
            "serviceEndpoint": Array [
              "x:url-id-2",
            ],
            "type": Array [
              "type-id-2",
            ],
          },
        ],
        "verificationMethod": Array [
          Object {
            "controller": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf",
            "id": "did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:z16QMTH1Pc4A99Und9RZvzyikFR73Aepx9exPZPgXJX18upeuSpgXeat2LsjEQpXUBUtaRtdpSXpv42KitoFqySLjiuXVcghuoWviPci3QrnQMeD161howeWdF5GTbBFRHSVXpEu9PWbtUEsnLfDf2NQgu4LmktN8Ti6CAmdQtQiVNbJkB7TnyzLiJJ27rYayWj15mjJ9EoNyyu3rDJGomi2vUgt2DiSUXaJbnSzuuFf#authentication",
            "publicKeyBase58": "11111111111111111111111111111111",
            "type": "Ed25519VerificationKey2018",
          },
          Object {
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
      exportToDidDocument(lightDidDetails, 'random-mime-type')
    ).toThrow()
  })
})

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-export
 */

import {
  DidDocumentPublicKeyType,
  DidPublicKey,
  DidUri,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { Attestation, Credential, CType } from '@kiltprotocol/core'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import { DocumentLoader } from 'jsonld-signatures'
import { base58Encode } from '@polkadot/util-crypto'
import * as toVC from './exportToVerifiableCredential'
import * as verificationUtils from './verificationUtils'
import * as presentationUtils from './presentationUtils'
import type { IPublicKeyRecord, VerifiableCredential } from './types'
import {
  KILT_VERIFIABLECREDENTIAL_TYPE,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  KILT_CREDENTIAL_CONTEXT_URL,
} from './constants'

const ctype = CType.fromCType({
  schema: {
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'membership',
    properties: {
      birthday: {
        type: 'string',
        format: 'date',
      },
      name: {
        type: 'string',
      },
      premium: {
        type: 'boolean',
      },
    },
    type: 'object',
    $id: 'kilt:ctype:0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
  },
  owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  hash: '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
})

const credential = Credential.fromCredential({
  request: {
    claim: {
      contents: {
        birthday: '1991-01-01',
        name: 'Kurt',
        premium: true,
      },
      owner: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      cTypeHash:
        '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
    },
    claimHashes: [
      '0x0586412d7b8adf811c288211c9c704b3331bb3adb61fba6448c89453568180f6',
      '0x3856178f49d3c379e00793125678eeb8db61cfa4ed32cd7a4b67ac8e27714fc1',
      '0x683428497edeba0198f02a45a7015fc2c010fa75994bc1d1372349c25e793a10',
      '0x8804cc546c4597b2ab0541dd3a6532e338b0b5b4d2458eb28b4d909a5d4caf4e',
    ],
    claimNonceMap: {
      '0xe5a099ea4f8be89227af8a5d74b0371e1c13232978c8b8edce1ecec698eb2665':
        'eab8a98c-0ef3-4a33-a5c7-c9821b3bec45',
      '0x14a06c5955ebc9247c9f54b30e0f1714e6ebd54ae05ad7b16fa9a4643dff1dc2':
        'fda7a7d4-770c-4cae-9cd9-6deebdb3ed80',
      '0xb102f462e4cde1b48e7936085cef1e2ab6ae4f7ca46cd3fab06074c00546a33d':
        'ed28443a-ec36-4a54-9caa-6bf014df257d',
      '0xf42b46c4a7a3bad68650069bd81fdf2085c9ea02df1c27a82282e97e3f71ef8e':
        'adc7dc71-ab0a-45f9-a091-9f3ec1bb96c7',
    },
    legitimations: [],
    delegationId: null,
    rootHash:
      '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
    claimerSignature: {
      signature:
        '0x00c374b5314d7192224bd620047f740c029af118eb5645a4662f76a2e3d70a877290f9a96cb9ee9ccc6c6bce24a0cf132a07edb603d0d0632f84210d528d2a7701',
      keyUri: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#key1',
    },
  },
  attestation: {
    claimHash:
      '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
    cTypeHash:
      '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
    delegationId: null,
    owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    revoked: false,
  },
})

it('exports credential to VC', () => {
  expect(toVC.fromCredential(credential)).toMatchObject({
    '@context': [
      DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
      KILT_CREDENTIAL_CONTEXT_URL,
    ],
    type: [DEFAULT_VERIFIABLECREDENTIAL_TYPE, KILT_VERIFIABLECREDENTIAL_TYPE],
    credentialSubject: {
      '@id': 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      birthday: '1991-01-01',
      name: 'Kurt',
      premium: true,
    },
    id: 'kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
    issuanceDate: expect.any(String),
    issuer: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    legitimationIds: [],
    nonTransferable: true,
  })
})

it('exports includes ctype as schema', () => {
  expect(toVC.fromCredential(credential, ctype)).toMatchObject({
    credentialSchema: {
      '@id': ctype.schema.$id,
      name: ctype.schema.title,
      '@type': 'JsonSchemaValidator2018',
      author: ctype.owner || null,
      schema: ctype.schema,
    },
  })
})

it('VC has correct format (full example)', () => {
  expect(toVC.fromCredential(credential, ctype)).toMatchObject({
    '@context': [
      DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
      KILT_CREDENTIAL_CONTEXT_URL,
    ],
    type: [DEFAULT_VERIFIABLECREDENTIAL_TYPE, KILT_VERIFIABLECREDENTIAL_TYPE],
    credentialSchema: {
      '@id': expect.any(String),
      '@type': 'JsonSchemaValidator2018',
      author: expect.any(String),
      name: 'membership',
      schema: {
        $id: expect.any(String),
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        properties: {
          birthday: {
            format: 'date',
            type: 'string',
          },
          name: {
            type: 'string',
          },
          premium: {
            type: 'boolean',
          },
        },
        title: 'membership',
        type: 'object',
      },
    },
    credentialSubject: {
      '@context': {
        '@vocab': expect.any(String),
      },
      '@id': expect.any(String),
      birthday: '1991-01-01',
      name: 'Kurt',
      premium: true,
    },
    delegationId: undefined,
    id: expect.any(String),
    issuanceDate: expect.any(String),
    issuer: expect.any(String),
    legitimationIds: [],
    nonTransferable: true,
    proof: [
      {
        signature: expect.any(String),
        type: 'KILTSelfSigned2020',
        verificationMethod: expect.any(String),
      },
      {
        attester: expect.any(String),
        type: 'KILTAttestation2020',
      },
      {
        claimHashes: expect.any(Array),
        nonces: expect.any(Object),
        type: 'KILTCredentialDigest2020',
      },
    ],
  })
})

describe('proofs', () => {
  let VC: VerifiableCredential
  let documentLoader: DocumentLoader
  beforeAll(() => {
    VC = toVC.fromCredential(credential)
    const keyId: DidPublicKey['uri'] = VC.proof[0].verificationMethod
    const verificationMethod: IPublicKeyRecord = {
      uri: keyId,
      type: DidDocumentPublicKeyType.Ed25519VerificationKey,
      publicKeyBase58: base58Encode(
        Crypto.decodeAddress(DidUtils.parseDidUri(keyId).identifier)
      ),
      controller: VC.credentialSubject['@id'] as DidUri,
    }
    documentLoader = (url) => {
      if (url === keyId) {
        return Promise.resolve({
          documentUrl: url,
          document: verificationMethod,
        })
      }
      return Promise.reject(Error('not found'))
    }
  })

  it('it verifies self-signed proof', async () => {
    // verify
    await expect(
      verificationUtils.verifySelfSignedProof(VC, VC.proof[0], documentLoader)
    ).resolves.toMatchObject({
      verified: true,
    })
  })

  it('it verifies schema', () => {
    const VCWithSchema = toVC.fromCredential(credential, ctype)
    const result = verificationUtils.validateSchema(VCWithSchema)
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential with all properties revealed', async () => {
    expect(VC.proof[2].nonces).toMatchObject(credential.request.claimNonceMap)
    expect(Object.entries(VC.proof[2].nonces)).toHaveLength(4)
    const result = await verificationUtils.verifyCredentialDigestProof(
      VC,
      VC.proof[2]
    )
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential with selected properties revealed', async () => {
    const reducedRequest: IRequestForAttestation = JSON.parse(
      JSON.stringify(credential.request)
    )
    delete reducedRequest.claim.contents.name
    delete reducedRequest.claim.contents.birthday
    const reducedCredential = { ...credential, request: reducedRequest }
    const reducedVC = toVC.fromCredential(reducedCredential)

    const result = await verificationUtils.verifyCredentialDigestProof(
      reducedVC,
      reducedVC.proof[2]
    )
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({
      verified: true,
    })
  })

  it('makes presentation', async () => {
    const presentation = await presentationUtils.makePresentation(VC, ['name'])
    const { contents, owner } = credential.request.claim
    expect(presentation).toHaveProperty(
      'verifiableCredential.credentialSubject',
      {
        '@context': expect.any(Object),
        '@id': owner,
        name: contents.name,
      }
    )
    const VCfromPresentation =
      presentation.verifiableCredential as VerifiableCredential
    const result = await verificationUtils.verifyCredentialDigestProof(
      VCfromPresentation,
      VCfromPresentation.proof[2]
    )
    expect(result.errors).toEqual([])
    expect(result).toStrictEqual({ verified: true, errors: [] })
    expect(Object.entries(VCfromPresentation.proof[2].nonces)).toHaveLength(2)
  })

  it('verifies attestation proof on chain', async () => {
    jest
      .spyOn(Attestation, 'query')
      .mockResolvedValue(Attestation.fromAttestation(credential.attestation))

    const result = await verificationUtils.verifyAttestedProof(VC, VC.proof[1])
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({
      verified: true,
      status: verificationUtils.AttestationStatus.valid,
    })
  })

  describe('negative tests', () => {
    beforeEach(() => {
      VC = toVC.fromCredential(credential, ctype)
    })

    it('errors on proof mismatch', async () => {
      await expect(
        verificationUtils.verifySelfSignedProof(VC, VC.proof[1], documentLoader)
      ).resolves.toMatchObject({
        verified: false,
      })
      await expect(
        verificationUtils.verifyCredentialDigestProof(VC, VC.proof[0])
      ).resolves.toMatchObject({
        verified: false,
      })
      await expect(
        verificationUtils.verifyAttestedProof(VC, VC.proof[2])
      ).resolves.toMatchObject({
        verified: false,
      })
    })

    it('rejects selecting non-existent properties for presentation', async () => {
      await expect(
        presentationUtils.makePresentation(VC, ['name', 'age', 'profession'])
      ).rejects.toThrow()

      const presentation = await presentationUtils.makePresentation(VC, [
        'name',
      ])

      await expect(
        presentationUtils.makePresentation(
          presentation.verifiableCredential as VerifiableCredential,
          ['premium']
        )
      ).rejects.toThrow()
    })

    it('it detects tampering with credential digest', async () => {
      VC.id = `${VC.id.slice(0, 10)}1${VC.id.slice(11)}`
      await expect(
        verificationUtils.verifySelfSignedProof(VC, VC.proof[0], documentLoader)
      ).resolves.toMatchObject({
        verified: false,
      })
      await expect(
        verificationUtils.verifyCredentialDigestProof(VC, VC.proof[2])
      ).resolves.toMatchObject({
        verified: false,
      })
    })

    it('it detects tampering with credential fields', async () => {
      jest
        .spyOn(Attestation, 'query')
        .mockResolvedValue(Attestation.fromAttestation(credential.attestation))

      VC.delegationId = '0x123'
      await expect(
        verificationUtils.verifyCredentialDigestProof(VC, VC.proof[2])
      ).resolves.toMatchObject({
        verified: false,
      })
      await expect(
        verificationUtils.verifyAttestedProof(VC, VC.proof[1])
      ).resolves.toMatchObject({
        verified: false,
        status: verificationUtils.AttestationStatus.invalid,
      })
    })

    it('it detects tampering on claimed properties', () => {
      VC.credentialSubject.name = 'Kort'
      return expect(
        verificationUtils.verifyCredentialDigestProof(VC, VC.proof[2])
      ).resolves.toMatchObject({
        verified: false,
      })
    })

    it('it detects schema violations', () => {
      VC.credentialSubject.name = 42
      const result = verificationUtils.validateSchema(VC)
      expect(result).toMatchObject({
        verified: false,
      })
    })

    it('fails if attestation not on chain', async () => {
      jest.spyOn(Attestation, 'query').mockResolvedValue(null)

      const result = await verificationUtils.verifyAttestedProof(
        VC,
        VC.proof[1]
      )
      expect(result).toMatchObject({
        verified: false,
        status: verificationUtils.AttestationStatus.invalid,
      })
    })

    it('fails if attestation on chain not identical', async () => {
      jest.spyOn(Attestation, 'query').mockResolvedValue(
        Attestation.fromAttestation({
          ...credential.attestation,
          owner: credential.request.claim.owner,
        })
      )

      const result = await verificationUtils.verifyAttestedProof(
        VC,
        VC.proof[1]
      )
      expect(result).toMatchObject({
        verified: false,
        status: verificationUtils.AttestationStatus.invalid,
      })
    })

    it('fails if attestation revoked', async () => {
      jest.spyOn(Attestation, 'query').mockResolvedValue(
        Attestation.fromAttestation({
          ...credential.attestation,
          revoked: true,
        })
      )

      const result = await verificationUtils.verifyAttestedProof(
        VC,
        VC.proof[1]
      )
      expect(result).toMatchObject({
        verified: false,
        status: verificationUtils.AttestationStatus.revoked,
      })
    })
  })
})

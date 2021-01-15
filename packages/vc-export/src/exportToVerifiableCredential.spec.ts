/**
 * @packageDocumentation
 * @group unit/vc-export
 * @ignore
 */
import {
  Attestation,
  IRequestForAttestation,
  AttestedClaim,
  CType,
  Did,
} from '@kiltprotocol/core'
import toVC from './exportToVerifiableCredential'
import verificationUtils, { AttestationStatus } from './verificationUtils'
import claimerUtils, { makePresentation } from './presentationUtils'
import { VerifiableCredential } from './types'

// jest.mock('jsonld', () => {
//   return {
//     compact: (obj: Record<string, any>) => {
//       const prefix = obj['@context']['@vocab']
//       const compacted = {}
//       Object.entries(obj).forEach(([key, value]) => {
//         if (!key.startsWith('@')) compacted[prefix + key] = value
//         if (key === '@id') compacted[key] = value
//       })
//       return compacted
//     },
//   }
// })

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
    $id:
      'kilt:ctype:0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
  },
  owner: '5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
  hash: '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
})

const credential = AttestedClaim.fromAttestedClaim({
  request: {
    claim: {
      contents: {
        birthday: '1991-01-01',
        name: 'Kurt',
        premium: true,
      },
      owner: '5DWXHLumDybaDHL1KAdXHSAsevJn397xXh7SitvdJmGhBvA2',
      cTypeHash:
        '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
    },
    claimHashes: [
      '0x3856178f49d3c379e00793125678eeb8db61cfa4ed32cd7a4b67ac8e27714fc1',
      '0x683428497edeba0198f02a45a7015fc2c010fa75994bc1d1372349c25e793a10',
      '0x795caba48a4a3e480695f5b54b1ab10196b331f21524426d2d31621f43a8b552',
      '0x8804cc546c4597b2ab0541dd3a6532e338b0b5b4d2458eb28b4d909a5d4caf4e',
    ],
    claimNonceMap: {
      '0x6633a58860b38a476d0020f30499c236bca3f454e50389e07830d29ec6e819a3':
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
      '0xbcd6c154fe557e98080005b0b1109876522ddfaa355c2a2d9df63811ae675eb0',
    claimerSignature:
      '0x0067bff0552d43454c69a681390d81bb38c02cae1ebfcd0e91cd7f2c073f808dcd04967ef60fa1b9086a67f676612cf8b6c24a4f874a81f334266c5b37ecf8a70f',
    privacyEnhancement: null,
  },
  attestation: {
    claimHash:
      '0xbcd6c154fe557e98080005b0b1109876522ddfaa355c2a2d9df63811ae675eb0',
    cTypeHash:
      '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
    delegationId: null,
    owner: '5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
    revoked: false,
  },
})

it('exports credential to VC', () => {
  expect(toVC.fromAttestedClaim(credential)).toMatchObject({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    credentialSubject: {
      '@id': 'did:kilt:5DWXHLumDybaDHL1KAdXHSAsevJn397xXh7SitvdJmGhBvA2',
      birthday: '1991-01-01',
      name: 'Kurt',
      premium: true,
    },
    id: '0xbcd6c154fe557e98080005b0b1109876522ddfaa355c2a2d9df63811ae675eb0',
    issuanceDate: expect.any(String),
    issuer: 'did:kilt:5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
    legitimationIds: [],
    nonTransferable: true,
  })
})

it('exports includes ctype as schema', () => {
  expect(toVC.fromAttestedClaim(credential, ctype)).toMatchObject({
    credentialSchema: {
      '@id': ctype.schema.$id,
      name: ctype.schema.title,
      '@type': 'JsonSchemaValidator2018',
      author: ctype.owner ? Did.getIdentifierFromAddress(ctype.owner) : null,
      schema: ctype.schema,
    },
  })
})

it('VC has correct format (full example)', () => {
  expect(toVC.fromAttestedClaim(credential, ctype)).toMatchObject({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
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
        verificationMethod: {
          publicKeyHex: expect.any(String),
          type: 'Ed25519VerificationKey2018',
        },
      },
      {
        attesterAddress: expect.any(String),
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
  beforeAll(() => {
    VC = toVC.fromAttestedClaim(credential)
  })

  it('it verifies self-signed proof', () => {
    expect(
      verificationUtils.verifySelfSignedProof(VC, VC.proof[0])
    ).toMatchObject({
      verified: true,
    })
  })

  it('it verifies schema', () => {
    const VCWithSchema = toVC.fromAttestedClaim(credential, ctype)
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
    const reducedVC = toVC.fromAttestedClaim(reducedCredential)

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
    const presentation = await claimerUtils.makePresentation(VC, ['name'])
    const { contents, owner } = credential.request.claim
    expect(presentation).toHaveProperty(
      'verifiableCredential.credentialSubject',
      {
        '@context': expect.any(Object),
        '@id': Did.getIdentifierFromAddress(owner),
        name: contents.name,
      }
    )
    const VCfromPresentation = presentation.verifiableCredential as VerifiableCredential
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
      status: AttestationStatus.valid,
    })
  })

  describe('negative tests', () => {
    beforeEach(() => {
      VC = toVC.fromAttestedClaim(credential, ctype)
    })

    it('errors on proof mismatch', async () => {
      expect(
        verificationUtils.verifySelfSignedProof(VC, VC.proof[1])
      ).toMatchObject({
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
        makePresentation(VC, ['name', 'age', 'profession'])
      ).rejects.toThrow()

      const presentation = await makePresentation(VC, ['name'])

      await expect(
        makePresentation(
          presentation.verifiableCredential as VerifiableCredential,
          ['premium']
        )
      ).rejects.toThrow()
    })

    it('it detects tampering with credential digest', () => {
      VC.id = `1${VC.id.slice(1)}`
      expect(
        verificationUtils.verifySelfSignedProof(VC, VC.proof[0])
      ).toMatchObject({
        verified: false,
      })
      return expect(
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
        status: AttestationStatus.invalid,
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
        status: AttestationStatus.invalid,
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
        status: AttestationStatus.invalid,
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
        status: AttestationStatus.revoked,
      })
    })
  })
})

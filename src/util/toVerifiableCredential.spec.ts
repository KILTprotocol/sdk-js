import { Attestation, IClaim } from '..'
import AttestedClaim from '../attestedclaim'
import CType from '../ctype'
import attClaimToVC, {
  makeRevealPropertiesProof,
  verifyAttestedProof,
  verifyRevealPropertyProof,
  verifySelfSignedProof,
} from './toVerifiableCredential'

jest.mock('../attestation/Attestation.chain', () => {
  return { query: jest.fn() }
})

const ctype = CType.fromCType({
  schema: {
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'AntiCov',
    properties: {
      photo: {
        type: 'string',
      },
    },
    type: 'object',
    $id:
      'kilt:ctype:0x2ea0486bf4a62423c644fb127226974a8c971da5ddd27ead23b9189161e8bcea',
  },
  owner: '5HDp5xMH6Xe5cNGczpQQPkpdEGXpZGuYeQDK4GseKkMVbQup',
  hash: '0x2ea0486bf4a62423c644fb127226974a8c971da5ddd27ead23b9189161e8bcea',
})

const credential = AttestedClaim.fromAttestedClaim({
  request: {
    claim: {
      cTypeHash:
        '0x2ea0486bf4a62423c644fb127226974a8c971da5ddd27ead23b9189161e8bcea',
      contents: {
        photo: '<not available>',
      },
      owner: '5DWXHLumDybaDHL1KAdXHSAsevJn397xXh7SitvdJmGhBvA2',
    },
    claimOwner: {
      nonce: '5cdeff3d-0e71-484c-83da-77f0db84a0a5',
      hash:
        '0xa5c40addbccab6053540a4c9dd75e4e0b885776d86e0f6aeaad2f2d2d789dacc',
    },
    cTypeHash: {
      nonce: '3710db09-4d61-421e-8d37-5d6eb68d762f',
      hash:
        '0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2',
    },
    legitimations: [],
    delegationId:
      '0xca731f3697e9d78bbb908a72f59c4515978890336e0ea14df620dae13328d50d',
    claimHashTree: {
      photo: {
        nonce: '0a0e48d8-7b35-4889-864c-4b5c2c19a7a5',
        hash:
          '0xde765261eada7d3c3de6e12b382ac3d4d80d9e7d668dfda0df7e69160fa5a2ec',
      },
    },
    rootHash:
      '0x7fa0fce3f6f526c769dbee5973cc75a5edfecef071766c3e1351d9aac4db945c',
    claimerSignature:
      '0x0036bed7fa5e8bdff6fea08f106f2fabb9800bc71a7894bc151849bf2477c9b2ccd129b7a16693b08606abf8e4bc1af830c25de1dfa32c3e1697710ecf92eb1607',
    privacyEnhancement: null,
  },
  attestation: {
    claimHash:
      '0x7fa0fce3f6f526c769dbee5973cc75a5edfecef071766c3e1351d9aac4db945c',
    cTypeHash:
      '0x2ea0486bf4a62423c644fb127226974a8c971da5ddd27ead23b9189161e8bcea',
    delegationId:
      '0xca731f3697e9d78bbb908a72f59c4515978890336e0ea14df620dae13328d50d',
    owner: '5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
    revoked: false,
  },
})

it('exports credential to VC', () => {
  expect(attClaimToVC(credential)).toMatchObject({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    credentialSubject: {
      protected: {
        claim: {
          cTypeHash:
            '0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2',
          contents: {
            photo:
              '0xde765261eada7d3c3de6e12b382ac3d4d80d9e7d668dfda0df7e69160fa5a2ec',
          },
          owner:
            '0xa5c40addbccab6053540a4c9dd75e4e0b885776d86e0f6aeaad2f2d2d789dacc',
        },
        delegationId:
          '0xca731f3697e9d78bbb908a72f59c4515978890336e0ea14df620dae13328d50d',
        legitimations: [],
      },
    },
    id: '0x7fa0fce3f6f526c769dbee5973cc75a5edfecef071766c3e1351d9aac4db945c',
    issuanceDate: expect.any(String),
    issuer: 'did:kilt:5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
    nonTransferable: true,
  })
})

it('exports includes ctype as schema', () => {
  expect(attClaimToVC(credential, undefined, ctype)).toMatchObject({
    credentialSchema: {
      id:
        'kilt:ctype:0x2ea0486bf4a62423c644fb127226974a8c971da5ddd27ead23b9189161e8bcea',
      name: 'AntiCov',
      type: 'JsonSchemaValidator2018',
      author: '5HDp5xMH6Xe5cNGczpQQPkpdEGXpZGuYeQDK4GseKkMVbQup',
      schema: ctype.schema,
    },
  })
})

describe('proofs', () => {
  const VC = attClaimToVC(credential)

  it('it verifies self-signed proof', () => {
    expect(verifySelfSignedProof(VC, VC.proof[0])).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential with all properties revealed', () => {
    const revealAll = makeRevealPropertiesProof(
      credential.request.claim,
      credential.request
    )
    expect(verifyRevealPropertyProof(VC, revealAll)).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential and schema', () => {
    const VCWithSchema = attClaimToVC(credential, undefined, ctype)
    const revealAll = makeRevealPropertiesProof(
      credential.request.claim,
      credential.request
    )
    expect(
      verifyRevealPropertyProof(
        VC,
        revealAll,
        VCWithSchema.credentialSchema?.schema
      )
    ).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential with selected properties revealed', () => {
    const { request } = credential
    const claim: Partial<IClaim> = {
      owner: request.claim.owner,
      contents: { photo: request.claim.contents.photo },
    }
    const revealSome = makeRevealPropertiesProof(claim, request)
    expect(verifyRevealPropertyProof(VC, revealSome)).toMatchObject({
      verified: true,
    })
  })

  describe('on-chain proof', () => {
    require('../attestation/Attestation.chain').query.mockResolvedValue(
      Attestation.fromAttestation(credential.attestation)
    )

    it('verifies attestation proof', async () => {
      await expect(
        verifyAttestedProof(VC, VC.proof[1])
      ).resolves.toMatchObject({ verified: true })
    })
  })
})

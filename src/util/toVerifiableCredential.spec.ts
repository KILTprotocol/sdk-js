import { Attestation, IRequestForAttestation } from '..'
import AttestedClaim from '../attestedclaim'
import { PartialClaim } from '../claim/Claim.utils'
import CType from '../ctype'
import attClaimToVC, {
  validateSchema,
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
      '0x03ed47e8a767ce2cf8b00d38172cd68142656e4cc52e5a031b70a344f26a1a2d',
      '0x3856178f49d3c379e00793125678eeb8db61cfa4ed32cd7a4b67ac8e27714fc1',
      '0x683428497edeba0198f02a45a7015fc2c010fa75994bc1d1372349c25e793a10',
      '0x8804cc546c4597b2ab0541dd3a6532e338b0b5b4d2458eb28b4d909a5d4caf4e',
    ],
    claimNonceMap: {
      '0x4c40a046250a0ee4bc216929c5d71c6f75f318aaedc315599cc8a79e2c42b360':
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
      '0x3331f1b1ae7aae0be78b7a60d1ea0d59e81520c3b3686fc2de7775cd8ad568b5',
    claimerSignature:
      '0x0064081e98d3d065cb360aa20d0e9c21cf0ed9c2df96937a15827be8dc59ef685190b350059ddb2288ad5121bf642ee1c86eabd362e7f325c29281552a45bd800d',
    privacyEnhancement: null,
  },
  attestation: {
    claimHash:
      '0x3331f1b1ae7aae0be78b7a60d1ea0d59e81520c3b3686fc2de7775cd8ad568b5',
    cTypeHash:
      '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
    delegationId: null,
    owner: '5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
    revoked: false,
  },
})

it('exports credential to VC', () => {
  expect(attClaimToVC(credential)).toMatchObject({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    credentialSubject: {
      '@id': '5DWXHLumDybaDHL1KAdXHSAsevJn397xXh7SitvdJmGhBvA2',
      birthday: '1991-01-01',
      name: 'Kurt',
      premium: true,
    },
    id: '0x3331f1b1ae7aae0be78b7a60d1ea0d59e81520c3b3686fc2de7775cd8ad568b5',
    issuanceDate: expect.any(String),
    issuer: 'did:kilt:5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
    legitimationIds: [],
    nonTransferable: true,
  })
})

it('exports includes ctype as schema', () => {
  expect(attClaimToVC(credential, undefined, ctype)).toMatchObject({
    credentialSchema: {
      '@id': ctype.schema.$id,
      name: ctype.schema.title,
      '@type': 'JsonSchemaValidator2018',
      author: ctype.owner,
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

  it('it verifies schema', () => {
    const VCWithSchema = attClaimToVC(credential, undefined, ctype)
    const result = validateSchema(VCWithSchema)
    expect(result.error).toBeUndefined()
    expect(result).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential with all properties revealed', async () => {
    const result = await verifyRevealPropertyProof(VC, VC.proof[2])
    expect(result.error).toBeUndefined()
    expect(result).toMatchObject({
      verified: true,
    })
  })
  it('it verifies credential with selected properties revealed', async () => {
    const { claim } = credential.request
    const partialClaim: PartialClaim = {
      ...claim,
      contents: {},
    }
    const reducedRequest = {
      ...credential.request,
      claim: partialClaim,
    } as IRequestForAttestation
    const reducedCredential = { ...credential, request: reducedRequest }
    const reducedVC = attClaimToVC(reducedCredential)

    const result = await verifyRevealPropertyProof(
      reducedVC,
      reducedVC.proof[2]
    )
    expect(result.error).toBeUndefined()
    expect(result).toMatchObject({
      verified: true,
    })
  })

  describe('on-chain proof', () => {
    require('../attestation/Attestation.chain').query.mockResolvedValue(
      Attestation.fromAttestation(credential.attestation)
    )

    it('verifies attestation proof', async () => {
      const result = await verifyAttestedProof(VC, VC.proof[1])
      expect(result.error).toBeUndefined()
      expect(result).toMatchObject({
        verified: true,
      })
    })
  })
})

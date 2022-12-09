/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-export
 */

import {
  IAttestation,
  ICType,
  ICredentialPresentation,
} from '@kiltprotocol/types'
import { Attestation, Credential } from '@kiltprotocol/core'
import { ApiMocks } from '@kiltprotocol/testing'
import { randomAsU8a } from '@polkadot/util-crypto'
import { hexToU8a } from '@polkadot/util'
import type { VerifiableCredential } from './types'
import {
  credentialIdFromRootHash,
  fromICredential,
  validateStructure as validateCredentialStructure,
} from './KiltCredentialV1'
import {
  DEFAULT_CREDENTIAL_CONTEXTS,
  DEFAULT_CREDENTIAL_TYPES,
} from './constants'

import { verifyProof } from './KiltAttestationProofV1.js'

const mockedApi = ApiMocks.createAugmentedApi()

const ctype: ICType = {
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
}

const credential: ICredentialPresentation = {
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
}

const attestation: IAttestation = {
  claimHash:
    '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
  cTypeHash:
    '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
  delegationId: null,
  owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  revoked: false,
}

const timestamp = 1234567
const blockHash = randomAsU8a(32)
const genesisHash = randomAsU8a(32)
mockedApi.at = () => Promise.resolve(mockedApi)
jest
  .spyOn(mockedApi, 'genesisHash', 'get')
  .mockImplementation(() => genesisHash as any)
mockedApi.query.attestation = {
  attestations: jest.fn().mockResolvedValue(
    mockedApi.createType('Option<AttestationAttestationsAttestationDetails>', {
      ctypeHash:
        '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
      attester: '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
      revoked: false,
      deposit: {
        owner: '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
        amount: 0,
      },
    })
  ),
} as any
mockedApi.query.timestamp = {
  now: jest.fn().mockResolvedValue(mockedApi.createType('u64', timestamp)),
} as any

it('exports credential to VC', () => {
  const exported = fromICredential(
    credential,
    attestation.owner,
    timestamp,
    mockedApi.genesisHash,
    blockHash,
    ctype
  )
  expect(exported).toMatchObject({
    '@context': DEFAULT_CREDENTIAL_CONTEXTS,
    type: DEFAULT_CREDENTIAL_TYPES,
    credentialSubject: {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      '#birthday': '1991-01-01',
      '#name': 'Kurt',
      '#premium': true,
    },
    id: credentialIdFromRootHash(
      hexToU8a(
        '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad'
      )
    ),
    issuanceDate: expect.any(String),
    issuer: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    nonTransferable: true,
  })
  expect(() => validateCredentialStructure(exported)).not.toThrow()
})

it('exports includes ctype as schema', () => {
  const exported = fromICredential(
    credential,
    attestation.owner,
    timestamp,
    mockedApi.genesisHash,
    blockHash,
    ctype
  )
  expect(exported).toMatchObject({
    credentialSchema: {
      id: ctype.$id,
      name: ctype.title,
      type: 'JsonSchemaValidator2018',
      schema: ctype,
    },
  })
  expect(() => validateCredentialStructure(exported)).not.toThrow()
})

it('VC has correct format (full example)', () => {
  expect(
    fromICredential(
      credential,
      attestation.owner,
      timestamp,
      mockedApi.genesisHash,
      blockHash,
      ctype
    )
  ).toMatchObject({
    '@context': DEFAULT_CREDENTIAL_CONTEXTS,
    type: DEFAULT_CREDENTIAL_TYPES,
    credentialSchema: {
      id: expect.any(String),
      type: 'JsonSchemaValidator2018',
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
      id: expect.any(String),
      '#birthday': '1991-01-01',
      '#name': 'Kurt',
      '#premium': true,
    },
    id: expect.any(String),
    issuanceDate: expect.any(String),
    issuer: expect.any(String),
    nonTransferable: true,
    proof: {
      type: 'KiltAttestationProofV1',
      commitments: expect.any(Array),
      revealProof: expect.any(Array),
      block: expect.any(String),
    },
  })
})

describe('proofs', () => {
  let VC: VerifiableCredential
  beforeAll(() => {
    VC = fromICredential(
      credential,
      attestation.owner,
      timestamp,
      mockedApi.genesisHash,
      blockHash
    )
  })

  it('it verifies self-signed proof', async () => {
    // verify
    const { proof, ...cred } = VC
    expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
      verified: true,
    })
  })

  // it('it verifies schema', () => {
  //   const VCWithSchema = toVC.fromCredentialAndAttestation(
  //     credential,
  //     attestation,
  //     ctype
  //   )
  //   const result = verificationUtils.validateSchema(VCWithSchema)
  //   expect(result.errors).toEqual([])
  //   expect(result).toMatchObject({
  //     verified: true,
  //   })
  // })

  it('it verifies credential with all properties revealed', async () => {
    expect(VC.proof.revealProof).toHaveLength(4)
    const { proof, ...cred } = VC
    const result = await verifyProof(cred, proof, mockedApi)
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({
      verified: true,
    })
  })

  it('it verifies credential with selected properties revealed', async () => {
    const reducedCredential = Credential.removeClaimProperties(credential, [
      'name',
      'birthday',
    ])
    const { proof, ...reducedVC } = fromICredential(
      reducedCredential,
      attestation.owner,
      timestamp,
      mockedApi.genesisHash,
      blockHash
    )

    const result = await verifyProof(reducedVC, proof, mockedApi)
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({
      verified: true,
    })
  })

  // it('makes presentation', async () => {
  //   const presentation = await presentationUtils.makePresentation(VC, ['name'])
  //   const { contents, owner } = credential.claim
  //   expect(presentation).toHaveProperty(
  //     'verifiableCredential.credentialSubject',
  //     {
  //       '@context': expect.any(Object),
  //       '@id': owner,
  //       name: contents.name,
  //     }
  //   )
  //   const VCfromPresentation =
  //     presentation.verifiableCredential as VerifiableCredential
  //   const result = await verificationUtils.verifyCredentialDigestProof(
  //     VCfromPresentation,
  //     VCfromPresentation.proof[2]
  //   )
  //   expect(result.errors).toEqual([])
  //   expect(result).toStrictEqual({ verified: true, errors: [] })
  //   expect(Object.entries(VCfromPresentation.proof[2].nonces)).toHaveLength(2)
  // })

  describe('negative tests', () => {
    beforeEach(() => {
      VC = fromICredential(
        credential,
        attestation.owner,
        timestamp,
        mockedApi.genesisHash,
        blockHash
      )
    })

    it('errors on proof mismatch', async () => {
      // @ts-ignore
      delete VC.proof
      expect(
        await verifyProof(VC, { type: 'SomeOtherProof' } as any, mockedApi)
      ).toMatchObject({
        verified: false,
      })
    })

    // it('rejects selecting non-existent properties for presentation', async () => {
    //   await expect(
    //     presentationUtils.makePresentation(VC, ['name', 'age', 'profession'])
    //   ).rejects.toThrow()

    //   const presentation = await presentationUtils.makePresentation(VC, [
    //     'name',
    //   ])

    //   await expect(
    //     presentationUtils.makePresentation(
    //       presentation.verifiableCredential as VerifiableCredential,
    //       ['premium']
    //     )
    //   ).rejects.toThrow()
    // })

    it('it detects tampering with credential digest', async () => {
      // @ts-ignore
      VC.id = `${VC.id.slice(0, 10)}1${VC.id.slice(11)}`
      const { proof, ...cred } = VC
      expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
        verified: false,
      })
    })

    it('it detects tampering with credential fields', async () => {
      VC.federatedTrustModel = [
        {
          type: 'KiltAttesterLegitimationV1',
          id: credentialIdFromRootHash(randomAsU8a(32)),
        },
      ]
      const { proof, ...cred } = VC
      expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
        verified: false,
      })
    })

    it('it detects tampering on claimed properties', async () => {
      VC.credentialSubject.name = 'Kort'
      const { proof, ...cred } = VC
      expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
        verified: false,
      })
    })

    // it('it detects schema violations', () => {
    //   VC.credentialSubject.name = 42
    //   const result = verificationUtils.validateSchema(VC)
    //   expect(result).toMatchObject({
    //     verified: false,
    //   })
    // })

    it('fails if attestation not on chain', async () => {
      jest
        .mocked(mockedApi.query.attestation.attestations)
        .mockResolvedValueOnce(
          mockedApi.createType(
            'Option<AttestationAttestationsAttestationDetails>'
          ) as any
        )
      const { proof, ...cred } = VC
      expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
        verified: false,
      })
    })

    // it('fails if attestation on chain not identical', async () => {
    //   jest
    //     .mocked(mockedApi.query.attestation.attestations)
    //     .mockResolvedValueOnce(
    //       mockedApi.createType(
    //         'Option<AttestationAttestationsAttestationDetails>'
    //       ) as any
    //     )
    //   const { proof, ...cred } = VC
    //   expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
    //     verified: false,
    //   })
    // })

    it('fails if attestation revoked', async () => {
      jest.spyOn(Attestation, 'fromChain').mockReturnValue({
        ...attestation,
        revoked: true,
      })

      const { proof, ...cred } = VC
      expect(await verifyProof(cred, proof, mockedApi)).toMatchObject({
        verified: false,
      })
    })
  })
})

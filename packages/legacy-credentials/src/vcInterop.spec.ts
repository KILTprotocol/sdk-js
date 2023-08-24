/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aConcat, u8aToU8a } from '@polkadot/util'
import { randomAsU8a } from '@polkadot/util-crypto'

import type { IAttestation, ICType, ICredential } from '@kiltprotocol/types'
import {
  KiltAttestationProofV1,
  KiltCredentialV1,
  constants,
} from '@kiltprotocol/vc-export'

import { ApiMocks } from '../../../tests/testUtils'
import { calculateRootHash, removeClaimProperties } from './Credential'
import { fromVC, toVc } from './vcInterop'

// is not needed and imports a dependency that does not work in node 18
jest.mock('@digitalbazaar/http-client', () => ({}))

export const mockedApi = ApiMocks.createAugmentedApi()

const attestationCreatedIndex = u8aToU8a([
  62,
  mockedApi.events.attestation.AttestationCreated.meta.index.toNumber(),
])
export function makeAttestationCreatedEvents(events: unknown[][]) {
  return mockedApi.createType(
    'Vec<FrameSystemEventRecord>',
    events.map((eventData) => ({
      event: u8aConcat(
        attestationCreatedIndex,
        new (mockedApi.registry.findMetaEvent(attestationCreatedIndex))(
          mockedApi.registry,
          eventData
        ).toU8a()
      ),
    }))
  )
}

export const cType: ICType = {
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

export const credential: ICredential = {
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
  delegationId:
    '0xb102f462e4cde1b48e7936085cef1e2ab6ae4f7ca46cd3fab06074c00546a33d',
  rootHash: '0x',
}
credential.rootHash = calculateRootHash(credential)

export const attestation: IAttestation = {
  claimHash: credential.rootHash,
  cTypeHash: credential.claim.cTypeHash,
  delegationId: credential.delegationId,
  owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  revoked: false,
}

export const timestamp = 1234567
export const blockHash = randomAsU8a(32)
export const genesisHash = randomAsU8a(32)
jest.spyOn(mockedApi, 'at').mockImplementation(() => Promise.resolve(mockedApi))
jest
  .spyOn(mockedApi, 'queryMulti')
  .mockImplementation((calls) =>
    Promise.all(
      calls.map((call) => (Array.isArray(call) ? call[0](call[1]) : call()))
    )
  )
jest
  .spyOn(mockedApi, 'genesisHash', 'get')
  .mockImplementation(() => genesisHash as any)
mockedApi.query.attestation = {
  attestations: jest.fn().mockResolvedValue(
    mockedApi.createType('Option<AttestationAttestationsAttestationDetails>', {
      ctypeHash: attestation.cTypeHash,
      attester: '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
      revoked: false,
      authorizationId: { Delegation: attestation.delegationId },
    })
  ),
} as any
mockedApi.query.timestamp = {
  now: jest.fn().mockResolvedValue(mockedApi.createType('u64', timestamp)),
} as any

mockedApi.query.system = {
  events: jest
    .fn()
    .mockResolvedValue(
      makeAttestationCreatedEvents([
        [
          '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
          attestation.claimHash,
          attestation.cTypeHash,
          { Delegation: attestation.delegationId },
        ],
      ])
    ),
} as any

it('exports credential to VC', () => {
  const exported = toVc(credential, {
    issuer: attestation.owner,
    chainGenesisHash: mockedApi.genesisHash,
    blockHash,
    timestamp,
  })
  expect(exported).toMatchObject({
    '@context': constants.DEFAULT_CREDENTIAL_CONTEXTS,
    type: [...constants.DEFAULT_CREDENTIAL_TYPES, cType.$id],
    credentialSubject: {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      birthday: '1991-01-01',
      name: 'Kurt',
      premium: true,
    },
    id: KiltCredentialV1.idFromRootHash(credential.rootHash),
    issuanceDate: expect.any(String),
    issuer: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    nonTransferable: true,
  })
  expect(() => KiltCredentialV1.validateStructure(exported)).not.toThrow()
})

it('VC has correct format (full example)', () => {
  expect(
    toVc(credential, {
      issuer: attestation.owner,
      chainGenesisHash: mockedApi.genesisHash,
      blockHash,
      timestamp,
    })
  ).toMatchObject({
    '@context': constants.DEFAULT_CREDENTIAL_CONTEXTS,
    type: [...constants.DEFAULT_CREDENTIAL_TYPES, cType.$id],
    credentialSchema: {
      id: KiltCredentialV1.credentialSchema.$id,
      type: 'JsonSchema2023',
    },
    credentialSubject: {
      '@context': {
        '@vocab': expect.any(String),
      },
      id: expect.any(String),
      birthday: '1991-01-01',
      name: 'Kurt',
      premium: true,
    },
    id: expect.any(String),
    issuanceDate: expect.any(String),
    issuer: expect.any(String),
    nonTransferable: true,
    proof: {
      type: 'KiltAttestationProofV1',
      commitments: expect.any(Array),
      salt: expect.any(Array),
      block: expect.any(String),
    },
  })
})

it('reproduces credential in round trip', () => {
  const VC = toVc(credential, {
    issuer: attestation.owner,
    chainGenesisHash: mockedApi.genesisHash,
    blockHash,
    timestamp,
  })
  expect(fromVC(VC)).toMatchObject(credential)
})

it('it verifies credential with selected properties revealed', async () => {
  const reducedCredential = removeClaimProperties(credential, [
    'name',
    'birthday',
  ])
  const { proof, ...reducedVC } = toVc(reducedCredential, {
    issuer: attestation.owner,
    chainGenesisHash: mockedApi.genesisHash,
    blockHash,
    timestamp,
  })

  await expect(
    KiltAttestationProofV1.verify(reducedVC, proof, {
      api: mockedApi,
      cTypes: [cType],
    })
  ).resolves.not.toThrow()
})

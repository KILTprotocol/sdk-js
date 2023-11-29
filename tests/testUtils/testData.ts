/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  hexToU8a,
  stringToU8a,
  u8aCmp,
  u8aConcat,
  u8aToU8a,
} from '@polkadot/util'
import { base58Encode, randomAsU8a } from '@polkadot/util-crypto'

import { Credential } from '@kiltprotocol/legacy-credentials'
import type { IAttestation, ICType, ICredential } from '@kiltprotocol/types'
import { KiltCredentialV1, KiltAttestationProofV1 } from '@kiltprotocol/core'

import { createAugmentedApi } from './mocks/index.js'

export const mockedApi = createAugmentedApi()

// index of the attestation pallet, according to the metadata used
const attestationPalletIndex = 62
// asynchronously check that pallet index is correct
mockedApi.once('ready', () => {
  const idx = mockedApi.runtimeMetadata.asLatest.pallets.find((x) =>
    x.name.match(/attestation/i)
  )!.index
  if (!idx.eqn(attestationPalletIndex)) {
    console.warn(
      `The attestation pallet index is expected to be ${attestationPalletIndex}, but the metadata used lists it as ${idx.toNumber()}. This may lead to tests not behaving as expected!`
    )
  }
})
const attestationCreatedIndex = u8aToU8a([
  attestationPalletIndex,
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

const _legacyCredential: ICredential = {
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
_legacyCredential.rootHash = Credential.calculateRootHash(_legacyCredential)

// eslint-disable-next-line import/no-mutable-exports
export let legacyCredential: ICredential = JSON.parse(
  JSON.stringify(_legacyCredential)
)
beforeEach(() => {
  legacyCredential = JSON.parse(JSON.stringify(_legacyCredential))
})

export const attestation: IAttestation = {
  claimHash: _legacyCredential.rootHash,
  cTypeHash: _legacyCredential.claim.cTypeHash,
  delegationId: _legacyCredential.delegationId,
  owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  revoked: false,
}

export const timestamp = new Date(1234567)
export const blockHash = randomAsU8a(32)
export const genesisHash = randomAsU8a(32)

const _credential = JSON.stringify({
  ...KiltCredentialV1.fromInput({
    claims: _legacyCredential.claim.contents,
    claimHash: _legacyCredential.rootHash,
    subject: _legacyCredential.claim.owner,
    delegationId: _legacyCredential.delegationId ?? undefined,
    cType: cType.$id,
    issuer: attestation.owner,
    chainGenesisHash: genesisHash,
    timestamp,
  }),
  proof: {
    type: KiltAttestationProofV1.PROOF_TYPE,
    // `block` field is base58 encoding of block hash
    block: base58Encode(blockHash),
    // `commitments` (claimHashes) are base58 encoded in new format
    commitments: _legacyCredential.claimHashes.map((i) =>
      base58Encode(hexToU8a(i))
    ),
    // salt/nonces must be sorted by statement digest (keys) and base58 encoded
    salt: Object.entries(_legacyCredential.claimNonceMap)
      .map(([hsh, slt]) => [hexToU8a(hsh), stringToU8a(slt)])
      .sort((a, b) => u8aCmp(a[0], b[0]))
      .map((i) => base58Encode(i[1])),
  },
})

// eslint-disable-next-line import/no-mutable-exports
export let credential: KiltCredentialV1.Interface = JSON.parse(_credential)
beforeEach(() => {
  credential = JSON.parse(_credential)
})

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
  now: jest
    .fn()
    .mockResolvedValue(mockedApi.createType('u64', timestamp.getTime())),
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

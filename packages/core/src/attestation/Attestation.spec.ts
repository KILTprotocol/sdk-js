/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/attestation
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import type {
  IAttestation,
  CompressedAttestation,
  DidUri,
  ICType,
  IClaim,
  ICredential,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { ApiMocks } from '@kiltprotocol/testing'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type { HexString } from '@polkadot/util/types'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as Credential from '../credential'
import * as Attestation from './Attestation'

let mockedApi: any

beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  BlockchainApiConnection.setConnection(mockedApi)
})

describe('Attestation', () => {
  const identityAlice: DidUri =
    'did:kilt:4nwPAmtsK5toZfBM9WvmAe4Fa3LyZ3X3JHt7EUFfrcPPAZAm'
  const identityBob: DidUri =
    'did:kilt:4nxhWrDR27YzC5z4soRcz31MaeFn287JRqiE5y4u7jBEdgP2'
  let rawCTypeSchema: ICType['schema']
  let testCType: ICType
  let testContents: any
  let testClaim: IClaim
  let credential: ICredential

  beforeAll(async () => {
    rawCTypeSchema = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Attestation',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    testCType = CType.fromSchema(rawCTypeSchema, identityAlice)

    testContents = {}
    testClaim = Claim.fromCTypeAndClaimContents(
      testCType,
      testContents,
      identityBob
    )
    credential = Credential.fromClaim(testClaim)
  })

  it('stores attestation', async () => {
    mockedApi.query.attestation.attestations.mockReturnValue(
      ApiMocks.mockChainQueryReturn('attestation', 'attestations', [
        testCType.hash,
        DidUtils.getIdentifierFromKiltDid(identityAlice),
        null,
        false,
        [DidUtils.getIdentifierFromKiltDid(identityAlice), 10],
      ])
    )

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      identityAlice
    )
    expect(await Attestation.checkValidity(attestation.claimHash)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    mockedApi.query.attestation.attestations.mockReturnValue(
      ApiMocks.mockChainQueryReturn('attestation', 'attestations')
    )

    const attestation: IAttestation = {
      claimHash: credential.rootHash,
      cTypeHash: testCType.hash,
      delegationId: null,
      owner: identityAlice,
      revoked: false,
    }
    expect(await Attestation.checkValidity(attestation.claimHash)).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    mockedApi.query.attestation.attestations.mockReturnValue(
      ApiMocks.mockChainQueryReturn('attestation', 'attestations', [
        testCType.hash,
        DidUtils.getIdentifierFromKiltDid(identityAlice),
        null,
        true,
        [DidUtils.getIdentifierFromKiltDid(identityAlice), 10],
      ])
    )

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      identityAlice
    )
    expect(await Attestation.checkValidity(attestation.claimHash)).toBeFalsy()
  })

  it('compresses and decompresses the attestation object', () => {
    const attestation = Attestation.fromCredentialAndDid(
      credential,
      identityAlice
    )

    const compressedAttestation: CompressedAttestation = [
      attestation.claimHash,
      attestation.cTypeHash,
      attestation.owner,
      attestation.revoked,
      attestation.delegationId,
    ]

    expect(Attestation.compress(attestation)).toEqual(compressedAttestation)

    expect(Attestation.decompress(compressedAttestation)).toEqual(attestation)
  })

  it('Negative test for compresses and decompresses the attestation object', () => {
    const attestation = Attestation.fromCredentialAndDid(
      credential,
      identityAlice
    )

    const compressedAttestation: CompressedAttestation = [
      attestation.claimHash,
      attestation.cTypeHash,
      attestation.owner,
      attestation.revoked,
      attestation.delegationId,
    ]
    compressedAttestation.pop()
    // @ts-ignore
    delete attestation.claimHash

    expect(() => {
      Attestation.decompress(compressedAttestation)
    }).toThrow()

    expect(() => {
      Attestation.compress(attestation)
    }).toThrow()
  })
  it('error check should throw errors on faulty Attestations', () => {
    const cTypeHash: HexString =
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff'
    const claimHash: HexString =
      '0x21a3448ccf10f6568d8cd9a08af689c220d842b893a40344d010e398ab74e557'

    const everything = {
      claimHash,
      cTypeHash,
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    }

    // @ts-ignore
    const noClaimHash = {
      claimHash: '',
      cTypeHash,
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation

    // @ts-ignore
    const noCTypeHash = {
      claimHash,
      cTypeHash: '',
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation

    // @ts-ignore
    const malformedOwner = {
      claimHash,
      cTypeHash,
      owner: '',
      revoked: false,
      delegationId: null,
    } as IAttestation

    const noRevocationBit = {
      claimHash,
      cTypeHash,
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation
    // @ts-expect-error
    delete noRevocationBit.revoked
    const malformedClaimHash = {
      claimHash: claimHash.slice(0, 20) + claimHash.slice(21),
      cTypeHash,
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const malformedCTypeHash = {
      claimHash,
      cTypeHash: cTypeHash.slice(0, 20) + cTypeHash.slice(21),
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const malformedAddress = {
      claimHash,
      cTypeHash,
      owner: identityAlice.replace('4', 'D'),
      revoked: false,
      delegationId: null,
    } as IAttestation

    expect(() => Attestation.verifyDataStructure(noClaimHash)).toThrowError(
      SDKErrors.ClaimHashMissingError
    )

    expect(() => Attestation.verifyDataStructure(noCTypeHash)).toThrowError(
      SDKErrors.CTypeHashMissingError
    )

    expect(() => Attestation.verifyDataStructure(malformedOwner)).toThrowError(
      SDKErrors.OwnerMissingError
    )

    expect(() => Attestation.verifyDataStructure(noRevocationBit)).toThrowError(
      SDKErrors.RevokedTypeError
    )

    expect(() => Attestation.verifyDataStructure(everything)).not.toThrow()

    expect(() =>
      Attestation.verifyDataStructure(malformedClaimHash)
    ).toThrowError(SDKErrors.HashMalformedError)

    expect(() =>
      Attestation.verifyDataStructure(malformedCTypeHash)
    ).toThrowError(SDKErrors.HashMalformedError)

    expect(() =>
      Attestation.verifyDataStructure(malformedAddress)
    ).toThrowError(SDKErrors.InvalidDidFormatError)
  })
  it('Typeguard should return true on complete Attestations', () => {
    const attestation = Attestation.fromCredentialAndDid(
      credential,
      identityAlice
    )
    expect(Attestation.isIAttestation(attestation)).toBeTruthy()
    expect(
      Attestation.isIAttestation({ ...attestation, owner: '' })
    ).toBeFalsy()
  })
})

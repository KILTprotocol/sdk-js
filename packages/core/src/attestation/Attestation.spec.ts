/**
 * Copyright 2018-2021 BOTLabs GmbH.
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
  ICType,
  IClaim,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { DidUtils } from '@kiltprotocol/did'
import { ApiMocks } from '@kiltprotocol/testing'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as RequestForAttestation from '../requestforattestation'
import * as Attestation from './Attestation'

let mockedApi: any
let blockchain: Blockchain

beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  blockchain = new Blockchain(mockedApi)
  BlockchainApiConnection.setConnection(Promise.resolve(blockchain))
})

describe('Attestation', () => {
  const identityAlice =
    'did:kilt:4nwPAmtsK5toZfBM9WvmAe4Fa3LyZ3X3JHt7EUFfrcPPAZAm'
  const identityBob =
    'did:kilt:4nxhWrDR27YzC5z4soRcz31MaeFn287JRqiE5y4u7jBEdgP2'
  let rawCTypeSchema: ICType['schema']
  let testCType: ICType
  let testcontents: any
  let testClaim: IClaim
  let requestForAttestation: IRequestForAttestation

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

    testcontents = {}
    testClaim = Claim.fromCTypeAndClaimContents(
      testCType,
      testcontents,
      identityBob
    )
    requestForAttestation = RequestForAttestation.fromClaim(testClaim)
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

    const attestation: IAttestation = Attestation.fromRequestAndDid(
      requestForAttestation,
      identityAlice
    )
    expect(await Attestation.checkValidity(attestation)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    mockedApi.query.attestation.attestations.mockReturnValue(
      ApiMocks.mockChainQueryReturn('attestation', 'attestations')
    )

    const attestation: IAttestation = {
      claimHash: requestForAttestation.rootHash,
      cTypeHash: testCType.hash,
      delegationId: null,
      owner: identityAlice,
      revoked: false,
    }
    expect(await Attestation.checkValidity(attestation)).toBeFalsy()
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

    const attestation: IAttestation = Attestation.fromRequestAndDid(
      requestForAttestation,
      identityAlice
    )
    expect(await Attestation.checkValidity(attestation)).toBeFalsy()
  })

  it('compresses and decompresses the attestation object', () => {
    const attestation = Attestation.fromRequestAndDid(
      requestForAttestation,
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
    const attestation = Attestation.fromRequestAndDid(
      requestForAttestation,
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
    const { cTypeHash, claimHash } = {
      cTypeHash:
        '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
      claimHash:
        '0x21a3448ccf10f6568d8cd9a08af689c220d842b893a40344d010e398ab74e557',
    }

    const everything = {
      claimHash,
      cTypeHash,
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    }

    const noClaimHash = {
      claimHash: '',
      cTypeHash,
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const noCTypeHash = {
      claimHash,
      cTypeHash: '',
      owner: identityAlice,
      revoked: false,
      delegationId: null,
    } as IAttestation

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

    expect(() => Attestation.errorCheck(noClaimHash)).toThrowErrorWithCode(
      SDKErrors.ERROR_CLAIM_HASH_NOT_PROVIDED()
    )

    expect(() => Attestation.errorCheck(noCTypeHash)).toThrowErrorWithCode(
      SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
    )

    expect(() => Attestation.errorCheck(malformedOwner)).toThrowErrorWithCode(
      SDKErrors.ERROR_OWNER_NOT_PROVIDED()
    )

    expect(() => Attestation.errorCheck(noRevocationBit)).toThrowErrorWithCode(
      SDKErrors.ERROR_REVOCATION_BIT_MISSING()
    )

    expect(() => Attestation.errorCheck(everything)).not.toThrow()

    expect(() =>
      Attestation.errorCheck(malformedClaimHash)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())

    expect(() =>
      Attestation.errorCheck(malformedCTypeHash)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())

    expect(() => Attestation.errorCheck(malformedAddress)).toThrowErrorWithCode(
      SDKErrors.ERROR_INVALID_DID_FORMAT(malformedAddress.owner)
    )
  })
  it('Typeguard should return true on complete Attestations', () => {
    const attestation = Attestation.fromRequestAndDid(
      requestForAttestation,
      identityAlice
    )
    expect(Attestation.isIAttestation(attestation)).toBeTruthy()
    expect(
      Attestation.isIAttestation({ ...attestation, owner: '' })
    ).toBeFalsy()
  })
})

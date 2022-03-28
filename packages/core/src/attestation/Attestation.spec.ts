/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/attestation
 */

import type {
  IAttestation,
  CompressedAttestation,
  ICType,
  DidUri,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { ApiMocks } from '@kiltprotocol/testing'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import type { HexString } from '@polkadot/util/types'
import { Claim } from '../claim/Claim'
import { CType } from '../ctype/CType'
import { RequestForAttestation } from '../requestforattestation/RequestForAttestation'
import { Attestation } from './Attestation'
import * as AttestationUtils from './Attestation.utils'

let mockedApi: any
let blockchain: Blockchain

beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  blockchain = new Blockchain(mockedApi)
  BlockchainApiConnection.setConnection(Promise.resolve(blockchain))
})

describe('Attestation', () => {
  const identityAlice: DidUri =
    'did:kilt:4nwPAmtsK5toZfBM9WvmAe4Fa3LyZ3X3JHt7EUFfrcPPAZAm'
  const identityBob: DidUri =
    'did:kilt:4nxhWrDR27YzC5z4soRcz31MaeFn287JRqiE5y4u7jBEdgP2'
  let rawCTypeSchema: ICType['schema']
  let testCType: CType
  let testcontents: any
  let testClaim: Claim
  let requestForAttestation: RequestForAttestation

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

    const attestation: Attestation = Attestation.fromRequestAndDid(
      requestForAttestation,
      identityAlice
    )
    expect(await Attestation.checkValidity(attestation)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    mockedApi.query.attestation.attestations.mockReturnValue(
      ApiMocks.mockChainQueryReturn('attestation', 'attestations')
    )

    const attestation: Attestation = Attestation.fromAttestation({
      claimHash: requestForAttestation.rootHash,
      cTypeHash: testCType.hash,
      delegationId: null,
      owner: identityAlice,
      revoked: false,
    })
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

    const attestation: Attestation = Attestation.fromRequestAndDid(
      requestForAttestation,
      identityAlice
    )
    expect(await attestation.checkValidity()).toBeFalsy()
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

    expect(AttestationUtils.compress(attestation)).toEqual(
      compressedAttestation
    )

    expect(AttestationUtils.decompress(compressedAttestation)).toEqual(
      attestation
    )

    expect(Attestation.decompress(compressedAttestation)).toEqual(attestation)

    expect(attestation.compress()).toEqual(compressedAttestation)
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
      AttestationUtils.decompress(compressedAttestation)
    }).toThrow()

    expect(() => {
      Attestation.decompress(compressedAttestation)
    }).toThrow()
    expect(() => {
      attestation.compress()
    }).toThrow()
    expect(() => {
      AttestationUtils.compress(attestation)
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

    expect(() => AttestationUtils.errorCheck(noClaimHash)).toThrowErrorWithCode(
      SDKErrors.ERROR_CLAIM_HASH_NOT_PROVIDED()
    )

    expect(() => AttestationUtils.errorCheck(noCTypeHash)).toThrowErrorWithCode(
      SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
    )

    expect(() =>
      AttestationUtils.errorCheck(malformedOwner)
    ).toThrowErrorWithCode(SDKErrors.ERROR_OWNER_NOT_PROVIDED())

    expect(() =>
      AttestationUtils.errorCheck(noRevocationBit)
    ).toThrowErrorWithCode(SDKErrors.ERROR_REVOCATION_BIT_MISSING())

    expect(() => AttestationUtils.errorCheck(everything)).not.toThrow()

    expect(() =>
      AttestationUtils.errorCheck(malformedClaimHash)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())

    expect(() =>
      AttestationUtils.errorCheck(malformedCTypeHash)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())

    expect(() =>
      AttestationUtils.errorCheck(malformedAddress)
    ).toThrowErrorWithCode(
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

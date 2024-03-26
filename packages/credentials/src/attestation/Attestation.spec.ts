/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import { ConfigService } from '@kiltprotocol/config'
import type { CTypeHash, Did, IAttestation } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { ApiMocks } from '../../../../tests/testUtils'
import * as Attestation from './Attestation'

let mockedApi: any

beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  ConfigService.set({ api: mockedApi })
})

describe('Attestation', () => {
  const identityAlice: Did =
    'did:kilt:4nwPAmtsK5toZfBM9WvmAe4Fa3LyZ3X3JHt7EUFfrcPPAZAm'

  const cTypeHash: CTypeHash =
    '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff'
  const claimHash: CTypeHash =
    '0x21a3448ccf10f6568d8cd9a08af689c220d842b893a40344d010e398ab74e557'

  const attestation = {
    claimHash,
    cTypeHash,
    owner: identityAlice,
    revoked: false,
    delegationId: null,
  }

  it('error check should throw errors on faulty Attestations', () => {
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

    expect(() => Attestation.verifyDataStructure(attestation)).not.toThrow()

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
    expect(Attestation.isIAttestation(attestation)).toBe(true)
    expect(Attestation.isIAttestation({ ...attestation, owner: '' })).toBe(
      false
    )
  })
})

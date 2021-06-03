/**
 * @group unit/attestation
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import type {
  IClaim,
  CompressedAttestedClaim,
  ICType,
} from '@kiltprotocol/types'
import Attestation from '../attestation/Attestation'
import Claim from '../claim/Claim'
import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import AttestedClaim from './AttestedClaim'
import AttestedClaimUtils from './AttestedClaim.utils'

async function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  contents: IClaim['contents'],
  legitimations: AttestedClaim[]
): Promise<AttestedClaim> {
  // create claim
  const identityAlice = Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: 'kilt:ctype:0x1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Attested Claim',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType: CType = CType.fromSchema(
    rawCType,
    identityAlice.signKeyringPair.address
  )

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.address
  )
  // build request for attestation with legitimations
  const requestForAttestation = RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    {
      legitimations,
    }
  )
  // build attestation
  const testAttestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )
  // combine to attested claim
  const attestedClaim = AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

describe('RequestForAttestation', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let identityCharlie: Identity
  let legitimation: AttestedClaim
  let compressedLegitimation: CompressedAttestedClaim

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

    identityBob = Identity.buildFromURI('//Bob')
    identityCharlie = Identity.buildFromURI('//Charlie')

    legitimation = await buildAttestedClaim(identityAlice, identityBob, {}, [])
    compressedLegitimation = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        legitimation.request.claimNonceMap,
        legitimation.request.claimerSignature,
        legitimation.request.claimHashes,
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
      ],
      [
        legitimation.attestation.claimHash,
        legitimation.attestation.cTypeHash,
        legitimation.attestation.owner,
        legitimation.attestation.revoked,
        legitimation.attestation.delegationId,
      ],
    ]
  })

  it('verify attested claims', async () => {
    const attestedClaim = await buildAttestedClaim(
      identityCharlie,
      identityAlice,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    // check proof on complete data
    expect(AttestedClaim.verifyData(attestedClaim)).toBeTruthy()
  })

  it('compresses and decompresses the attested claims object', () => {
    expect(AttestedClaimUtils.compress(legitimation)).toEqual(
      compressedLegitimation
    )

    expect(AttestedClaimUtils.decompress(compressedLegitimation)).toEqual(
      legitimation
    )

    expect(legitimation.compress()).toEqual(
      AttestedClaimUtils.compress(legitimation)
    )

    expect(AttestedClaim.decompress(compressedLegitimation)).toEqual(
      legitimation
    )
  })

  it('Negative test for compresses and decompresses the attested claims object', () => {
    compressedLegitimation.pop()
    // @ts-expect-error
    delete legitimation.attestation

    expect(() => {
      AttestedClaimUtils.compress(legitimation)
    }).toThrow()

    expect(() => {
      AttestedClaimUtils.decompress(compressedLegitimation)
    }).toThrow()
    expect(() => {
      AttestedClaim.decompress(compressedLegitimation)
    }).toThrow()
    expect(() => {
      legitimation.compress()
    }).toThrow()
  })
  it('Typeguard should return true on complete AttestedClaims', async () => {
    const testAttestation = await buildAttestedClaim(
      identityAlice,
      identityBob,
      {},
      []
    )
    expect(AttestedClaim.isIAttestedClaim(testAttestation)).toBeTruthy()
    // @ts-expect-error
    delete testAttestation.attestation.claimHash

    expect(AttestedClaim.isIAttestedClaim(testAttestation)).toBeFalsy()
  })
  it('Should throw error when attestation is from different request', async () => {
    const testAttestation = await buildAttestedClaim(
      identityAlice,
      identityBob,
      {},
      []
    )
    expect(AttestedClaim.isIAttestedClaim(testAttestation)).toBeTruthy()
    const { cTypeHash } = testAttestation.attestation
    testAttestation.attestation.cTypeHash = [
      cTypeHash.slice(0, 15),
      ((parseInt(cTypeHash.charAt(15), 16) + 1) % 16).toString(16),
      cTypeHash.slice(16),
    ].join('')
    expect(AttestedClaim.isIAttestedClaim(testAttestation)).toBeFalsy()
  })
  it('returns Claim Hash of the attestation', async () => {
    const testAttestation = await buildAttestedClaim(
      identityAlice,
      identityBob,
      {},
      []
    )
    expect(testAttestation.getHash()).toEqual(
      testAttestation.attestation.claimHash
    )
  })
})

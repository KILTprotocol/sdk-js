import Identity from '../identity/Identity'
import AttestedClaim from './AttestedClaim'
import AttestedClaimUtils from './AttestedClaim.utils'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import IClaim from '../types/Claim'
import { CompressedAttestedClaim } from '../types/AttestedClaim'

function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  ctype: string, // TODO: this parameter is never used, can we remove it?
  contents: IClaim['contents'],
  legitimations: AttestedClaim[]
): AttestedClaim {
  // create claim
  const identityAlice = Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: '',
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.address
  )
  // build request for attestation with legitimations
  const requestForAttestation = RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    legitimations,
    null
  )
  // build attestation
  const testAttestation: Attestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester
  )
  // combine to attested claim
  const attestedClaim: AttestedClaim = AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

describe('RequestForAttestation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const identityBob = Identity.buildFromURI('//Bob')
  const identityCharlie = Identity.buildFromURI('//Charlie')

  const legitimation: AttestedClaim = buildAttestedClaim(
    identityAlice,
    identityBob,
    'legitimationCtype',
    {},
    []
  )
  const compressedLegitimation: CompressedAttestedClaim = [
    [
      [
        legitimation.request.claim.contents,
        legitimation.request.claim.cTypeHash,
        legitimation.request.claim.owner,
      ],
      {},
      [
        legitimation.request.claimOwner.hash,
        legitimation.request.claimOwner.nonce,
      ],
      legitimation.request.claimerSignature,
      [
        legitimation.request.cTypeHash.hash,
        legitimation.request.cTypeHash.nonce,
      ],
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

  it('verify attested claims', async () => {
    const attestedClaim: AttestedClaim = buildAttestedClaim(
      identityCharlie,
      identityAlice,
      'ctype',
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    // check proof on complete data
    expect(attestedClaim.verifyData()).toBeTruthy()

    // build a representation excluding claim properties and verify proof
    const correctPresentation = attestedClaim.createPresentation(['a'])
    expect(correctPresentation.verifyData()).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const falsePresentation = attestedClaim.createPresentation([])
    const propertyName = 'a'
    delete falsePresentation.request.claim.contents[propertyName]
    delete falsePresentation.request.claimHashTree[propertyName]
    expect(falsePresentation.verifyData()).toBeFalsy()
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
})

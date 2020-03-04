import Identity from '../identity/Identity'
import RequestForAttestation, {
  compressRequestForAttestation,
  CompressedRequestForAttestation,
  decompressRequestForAttestation,
  compressClaimHashTree,
  compressNonceAndHash,
  compressLegitimation,
} from './RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'
import { compressClaim } from '../claim/Claim'

function buildRequestForAttestation(
  claimer: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): RequestForAttestation {
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

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.address,
  }
  // build request for attestation with legimitations
  return RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    legitimations,
    null
  )
}

describe('RequestForAttestation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const identityBob = Identity.buildFromURI('//Bob')
  const identityCharlie = Identity.buildFromURI('//Charlie')

  const legitimationRequest: RequestForAttestation = buildRequestForAttestation(
    identityAlice,
    'legitimationCtype',
    {},
    []
  )
  // build attestation
  const legitimationAttestationCharlie: Attestation = Attestation.fromRequestAndPublicIdentity(
    legitimationRequest,
    identityCharlie
  )
  // combine to attested claim
  const legitimationCharlie: AttestedClaim = AttestedClaim.fromRequestAndAttestation(
    legitimationRequest,
    legitimationAttestationCharlie
  )

  it('verify request for attestation', async () => {
    const request: RequestForAttestation = buildRequestForAttestation(
      identityBob,
      'ctype',
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimationCharlie]
    )

    // check proof on complete data
    expect(request.verifyData()).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const propertyName = 'a'
    delete request.claim.contents[propertyName]
    delete request.claimHashTree[propertyName]
    expect(request.verifyData()).toBeFalsy()
  })

  it('throws on wrong hash in claim hash tree', () => {
    const request: RequestForAttestation = buildRequestForAttestation(
      identityBob,
      'ctype',
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    // @ts-ignore
    request.claimHashTree.a.nonce = '1234'
    expect(() => {
      request.verifyData()
    }).toThrow()
  })

  it('hides the claim owner', () => {
    const request = buildRequestForAttestation(identityBob, 'ctype', {}, [])
    request.removeClaimOwner()
    expect(request.claimOwner.nonce).toBeUndefined()
    expect(request.claim.owner).toBeUndefined()
  })

  it('compresses and decompresses the request for attestation object', () => {
    const legitimationAttestationBob: Attestation = Attestation.fromRequestAndPublicIdentity(
      legitimationRequest,
      identityBob
    )
    const legitimationBob: AttestedClaim = AttestedClaim.fromRequestAndAttestation(
      legitimationRequest,
      legitimationAttestationBob
    )
    const reqForAtt: RequestForAttestation = buildRequestForAttestation(
      identityBob,
      'ctype',
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimationCharlie, legitimationBob]
    )

    const compressedReqForAtt: CompressedRequestForAttestation = [
      compressClaim(reqForAtt.claim),
      compressClaimHashTree(reqForAtt.claimHashTree),
      compressNonceAndHash(reqForAtt.claimOwner),
      reqForAtt.claimerSignature,
      compressNonceAndHash(reqForAtt.cTypeHash),
      reqForAtt.rootHash,
      compressLegitimation(reqForAtt.legitimations),
      reqForAtt.delegationId,
    ]

    expect(compressRequestForAttestation(reqForAtt)).toEqual(
      compressedReqForAtt
    )

    expect(decompressRequestForAttestation(compressedReqForAtt)).toEqual(
      reqForAtt
    )
    expect(reqForAtt.compress()).toEqual(compressedReqForAtt)
    expect(RequestForAttestation.decompress(compressedReqForAtt)).toEqual(
      reqForAtt
    )
    expect(compressRequestForAttestation(reqForAtt)).not.toEqual(
      compressedReqForAtt[3]
    )

    expect(decompressRequestForAttestation(compressedReqForAtt)).not.toEqual(
      reqForAtt.cTypeHash
    )
    expect(reqForAtt.compress()).not.toEqual(compressedReqForAtt[4])
    expect(RequestForAttestation.decompress(compressedReqForAtt)).not.toEqual(
      reqForAtt.claimOwner
    )
  })

  it('hides claim properties', () => {
    const request = buildRequestForAttestation(
      identityBob,
      'ctype',
      { a: 'a', b: 'b' },
      []
    )
    request.removeClaimProperties(['a'])

    expect((request.claim.contents as any).a).toBeUndefined()
    expect((request.claimHashTree as any).a.nonce).toBeUndefined()
    expect((request.claim.contents as any).b).toBe('b')
    expect((request.claimHashTree as any).b.nonce).toBeDefined()
  })
})

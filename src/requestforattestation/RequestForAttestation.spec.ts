import {
  ClaimerAttestationSession,
  AttesterAttestationSession,
} from '@kiltprotocol/portablegabi'
import Identity from '../identity/Identity'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import RequestForAttestation from './RequestForAttestation'
import RequestForAttestationUtils from './RequestForAttestation.utils'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Attestation from '../attestation/Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim, { IClaimContents } from '../types/Claim'
import constants from '../test/constants'
import { CompressedRequestForAttestation } from '../types/RequestForAttestation'
import { CompressedAttestedClaim } from '../types/AttestedClaim'

async function buildRequestForAttestationPE(
  claimer: Identity,
  contents: IClaim['contents'],
  legitimations: AttestedClaim[]
): Promise<
  [
    RequestForAttestation,
    ClaimerAttestationSession | null,
    Identity,
    AttesterAttestationSession
  ]
> {
  // create claim

  const identityAlice = await AttesterIdentity.buildFromURIAndKey(
    '//Alice',
    constants.PUBLIC_KEY.valueOf(),
    constants.PRIVATE_KEY.valueOf()
  )

  const { message, session } = await identityAlice.initiateAttestation()

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
    owner: identityAlice.getAddress(),
    hash: '',
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.getAddress(),
  }
  // build request for attestation with legitimations
  const [
    request,
    claimerSession,
  ] = await RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    legitimations,
    initiateAttestationMsg: message,
    attesterPubKey: identityAlice.getPublicGabiKey(),
  })
  return [request, claimerSession, identityAlice, session]
}

async function buildRequestForAttestation(
  claimer: Identity,
  contents: IClaimContents,
  legitimations: AttestedClaim[]
): Promise<RequestForAttestation> {
  // create claim

  const identityAlice = await AttesterIdentity.buildFromURIAndKey(
    '//Alice',
    constants.PUBLIC_KEY.valueOf(),
    constants.PRIVATE_KEY.valueOf()
  )

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
    owner: identityAlice.getAddress(),
    hash: '',
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.getAddress(),
  }
  // build request for attestation with legitimations
  const request = (await RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    legitimations,
  }))[0]
  return request
}

describe('RequestForAttestation', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let identityCharlie: Identity
  let legitimationRequest: RequestForAttestation
  let legitimationAttestation: Attestation
  let legitimation: AttestedClaim
  let legitimationAttestationCharlie: Attestation
  let legitimationCharlie: AttestedClaim

  beforeEach(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')
    identityCharlie = await Identity.buildFromURI('//Charlie')
    legitimationRequest = await buildRequestForAttestation(
      identityAlice,
      {},
      []
    )
    // build attestation
    legitimationAttestation = Attestation.fromRequestAndPublicIdentity(
      legitimationRequest,
      identityCharlie.getPublicIdentity()
    )
    // combine to attested claim
    legitimation = new AttestedClaim({
      request: legitimationRequest,
      attestation: legitimationAttestation,
    })

    // build attestation
    legitimationAttestationCharlie = Attestation.fromRequestAndPublicIdentity(
      legitimationRequest,
      identityCharlie.getPublicIdentity()
    )
    // combine to attested claim
    legitimationCharlie = new AttestedClaim({
      request: legitimationRequest,
      attestation: legitimationAttestationCharlie,
    })
  })

  it('verify request for attestation', async () => {
    const request = await buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )
    // check proof on complete data
    expect(request.verifyData()).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const propertyName = 'a'
    delete request.claim.contents[propertyName]
    delete request.claimHashTree[propertyName]
    expect(request.verifyData()).toBeFalsy()
  })

  it('verify request for attestation (PE)', async () => {
    const [
      request,
      claimerSession,
      attester,
      attesterSession,
    ] = await buildRequestForAttestationPE(
      identityBob,
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
    expect(claimerSession).toBeDefined()
    expect(attester).toBeDefined()
    expect(attesterSession).toBeDefined()
  })

  it('throws on wrong hash in claim hash tree', async () => {
    const request = await buildRequestForAttestation(
      identityBob,
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

  it('hides the claim owner', async () => {
    const request = await buildRequestForAttestation(identityBob, {}, [])
    request.removeClaimOwner()
    expect(request.claimOwner.nonce).toBeUndefined()
    expect(request.claim.owner).toBeUndefined()
  })

  it('compresses and decompresses the request for attestation object', async () => {
    const legitimationAttestationBob = Attestation.fromRequestAndPublicIdentity(
      legitimationRequest,
      identityBob.getPublicIdentity()
    )
    const legitimationBob = new AttestedClaim({
      request: legitimationRequest,
      attestation: legitimationAttestationBob,
    })
    const reqForAtt = await buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimationCharlie, legitimationBob]
    )

    const compressedLegitimationCharlie: CompressedAttestedClaim = [
      [
        [
          legitimationCharlie.request.claim.contents,
          legitimationCharlie.request.claim.cTypeHash,
          legitimationCharlie.request.claim.owner,
        ],
        {},
        [
          legitimationCharlie.request.claimOwner.hash,
          legitimationCharlie.request.claimOwner.nonce,
        ],
        legitimationCharlie.request.claimerSignature,
        [
          legitimationCharlie.request.cTypeHash.hash,
          legitimationCharlie.request.cTypeHash.nonce,
        ],
        legitimationCharlie.request.rootHash,
        [],
        legitimationCharlie.request.delegationId,
        null,
      ],
      [
        legitimationCharlie.attestation.claimHash,
        legitimationCharlie.attestation.cTypeHash,
        legitimationCharlie.attestation.owner,
        legitimationCharlie.attestation.revoked,
        legitimationCharlie.attestation.delegationId,
      ],
    ]

    const compressedLegitimationBob: CompressedAttestedClaim = [
      [
        [
          legitimationBob.request.claim.contents,
          legitimationBob.request.claim.cTypeHash,
          legitimationBob.request.claim.owner,
        ],
        {},
        [
          legitimationBob.request.claimOwner.hash,
          legitimationBob.request.claimOwner.nonce,
        ],
        legitimationBob.request.claimerSignature,
        [
          legitimationBob.request.cTypeHash.hash,
          legitimationBob.request.cTypeHash.nonce,
        ],
        legitimationBob.request.rootHash,
        [],
        legitimationBob.request.delegationId,
        null,
      ],
      [
        legitimationBob.attestation.claimHash,
        legitimationBob.attestation.cTypeHash,
        legitimationBob.attestation.owner,
        legitimationBob.attestation.revoked,
        legitimationBob.attestation.delegationId,
      ],
    ]

    const compressedReqForAtt: CompressedRequestForAttestation = [
      [
        reqForAtt.claim.contents,
        reqForAtt.claim.cTypeHash,
        reqForAtt.claim.owner,
      ],
      {
        a: [reqForAtt.claimHashTree.a.hash, reqForAtt.claimHashTree.a.nonce],
        b: [reqForAtt.claimHashTree.b.hash, reqForAtt.claimHashTree.b.nonce],
        c: [reqForAtt.claimHashTree.c.hash, reqForAtt.claimHashTree.c.nonce],
      },
      [reqForAtt.claimOwner.hash, reqForAtt.claimOwner.nonce],
      reqForAtt.claimerSignature,
      [reqForAtt.cTypeHash.hash, reqForAtt.cTypeHash.nonce],
      reqForAtt.rootHash,
      [compressedLegitimationCharlie, compressedLegitimationBob],
      reqForAtt.delegationId,
      null,
    ]

    expect(RequestForAttestationUtils.compress(reqForAtt)).toEqual(
      compressedReqForAtt
    )

    expect(RequestForAttestationUtils.decompress(compressedReqForAtt)).toEqual(
      reqForAtt
    )

    expect(reqForAtt.compress()).toEqual(compressedReqForAtt)

    expect(RequestForAttestation.decompress(compressedReqForAtt)).toEqual(
      reqForAtt
    )
    compressedReqForAtt.pop()
    delete reqForAtt.claimOwner

    expect(() => {
      RequestForAttestationUtils.compress(reqForAtt)
    }).toThrow()

    expect(() => {
      RequestForAttestationUtils.decompress(compressedReqForAtt)
    }).toThrow()

    expect(() => {
      reqForAtt.compress()
    }).toThrow()

    expect(() => {
      RequestForAttestation.decompress(compressedReqForAtt)
    }).toThrow()
  })

  it('hides claim properties', async () => {
    const request = await buildRequestForAttestation(
      identityBob,
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

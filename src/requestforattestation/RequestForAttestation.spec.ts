/* eslint-disable dot-notation */
import {
  AttesterAttestationSession,
  ClaimerAttestationSession,
} from '@kiltprotocol/portablegabi'
import Attestation from '../attestation/Attestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import CType from '../ctype/CType'
import {
  ERROR_CLAIM_HASHTREE_MALFORMED,
  ERROR_LEGITIMATIONS_NOT_PROVIDED,
  ERROR_NONCE_HASH_INVALID,
  ERROR_ROOT_HASH_UNVERIFIABLE,
  ERROR_SIGNATURE_UNVERIFIABLE,
} from '../errorhandling/SDKErrors'
import AttesterIdentity from '../identity/AttesterIdentity'
import Identity from '../identity/Identity'
import constants from '../test/constants'
import { CompressedAttestedClaim } from '../types/AttestedClaim'
import IClaim, { IClaimContents } from '../types/Claim'
import ICType from '../types/CType'
import IRequestForAttestation, {
  CompressedRequestForAttestation,
} from '../types/RequestForAttestation'
import RequestForAttestation from './RequestForAttestation'
import RequestForAttestationUtils from './RequestForAttestation.utils'

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

  const identityAlice = await AttesterIdentity.buildFromURI('//Alice', {
    key: {
      publicKey: constants.PUBLIC_KEY.toString(),
      privateKey: constants.PRIVATE_KEY.toString(),
    },
  })

  const {
    messageBody: message,
    session,
  } = await identityAlice.initiateAttestation()

  const rawCType: ICType['schema'] = {
    $id: 'kilt:ctype:0x1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    title: 'title',
    type: 'object',
  }

  const testCType: CType = CType.fromSchema(
    rawCType,
    identityAlice.getAddress()
  )

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.getAddress(),
  }
  // build request for attestation with legitimations
  const {
    message: request,
    session: claimerSession,
  } = await RequestForAttestation.fromClaimAndIdentity(claim, claimer, {
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

  const identityAlice = await AttesterIdentity.buildFromURI('//Alice', {
    key: {
      publicKey: constants.PUBLIC_KEY.toString(),
      privateKey: constants.PRIVATE_KEY.toString(),
    },
  })

  const rawCType: ICType['schema'] = {
    $id: 'kilt:ctype:0x2',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'raw ctype',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType: CType = CType.fromSchema(
    rawCType,
    identityAlice.signKeyringPair.address
  )

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.getAddress(),
  }
  // build request for attestation with legitimations
  const request = (
    await RequestForAttestation.fromClaimAndIdentity(claim, claimer, {
      legitimations,
    })
  ).message
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
    expect(() => request.verifyData()).toThrowError(
      ERROR_ROOT_HASH_UNVERIFIABLE()
    )
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
    expect(RequestForAttestation.verifyData(request)).toBeTruthy()

    // just deleting a field will result in a wrong proof
    const propertyName = 'a'
    delete request.claim.contents[propertyName]
    delete request.claimHashTree[propertyName]
    expect(() => request.verifyData()).toThrowError(
      ERROR_ROOT_HASH_UNVERIFIABLE()
    )
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

    request.claimHashTree.a.nonce = '1234'
    expect(() => {
      RequestForAttestation.verifyData(request)
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

  it('should throw error on faulty constructor input', async () => {
    const builtRequest = await buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    const builtRequestWithLegitimation = (await buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimationCharlie]
    )) as IRequestForAttestation
    const builtRequestNoLegitimations = {
      ...(await buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      )),
    } as IRequestForAttestation
    delete builtRequestNoLegitimations.legitimations

    const builtRequestMalformedRootHash = {
      ...(await buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      )),
    } as IRequestForAttestation
    builtRequestMalformedRootHash.rootHash = [
      builtRequestMalformedRootHash.rootHash.slice(0, 15),
      (
        (parseInt(builtRequestMalformedRootHash.rootHash.charAt(15), 16) + 1) %
        16
      ).toString(16),
      builtRequestMalformedRootHash.rootHash.slice(16),
    ].join('')
    const builtRequestMalformedClaimOwner = {
      ...(await buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      )),
    } as IRequestForAttestation
    builtRequestMalformedClaimOwner.claimOwner = {
      hash: [
        builtRequestMalformedClaimOwner.claimOwner.hash.slice(0, 15),
        (
          (parseInt(
            builtRequestMalformedClaimOwner.claimOwner.hash.charAt(15),
            16
          ) +
            1) %
          16
        ).toString(16),
        builtRequestMalformedClaimOwner.claimOwner.hash.slice(16),
      ].join(''),
      nonce: builtRequestMalformedClaimOwner.claimOwner.nonce,
    }
    builtRequestMalformedClaimOwner.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](
      builtRequestMalformedClaimOwner.claimOwner,
      builtRequestMalformedClaimOwner.cTypeHash,
      builtRequestMalformedClaimOwner.claimHashTree,
      builtRequestMalformedClaimOwner.legitimations,
      builtRequestMalformedClaimOwner.delegationId
    )
    const builtRequestIncompleteClaimHashTree = {
      ...(await buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      )),
    } as IRequestForAttestation
    const deletedKey = 'a'
    delete builtRequestIncompleteClaimHashTree.claimHashTree[deletedKey]
    builtRequestIncompleteClaimHashTree.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](
      builtRequestIncompleteClaimHashTree.claimOwner,
      builtRequestIncompleteClaimHashTree.cTypeHash,
      builtRequestIncompleteClaimHashTree.claimHashTree,
      builtRequestIncompleteClaimHashTree.legitimations,
      builtRequestIncompleteClaimHashTree.delegationId
    )
    const builtRequestMalformedSignature = {
      ...(await buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      )),
    } as IRequestForAttestation
    builtRequestMalformedSignature.claimerSignature = builtRequestMalformedSignature.claimerSignature.replace(
      builtRequestMalformedSignature.claimerSignature.charAt(5),
      builtRequestMalformedSignature.claimerSignature.charAt(5) === 'd'
        ? 'e'
        : 'd'
    )
    builtRequestMalformedSignature.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](
      builtRequestMalformedSignature.claimOwner,
      builtRequestMalformedSignature.cTypeHash,
      builtRequestMalformedSignature.claimHashTree,
      builtRequestMalformedSignature.legitimations,
      builtRequestMalformedSignature.delegationId
    )
    const builtRequestMalformedCtypeHash = {
      ...(await buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      )),
    } as IRequestForAttestation
    builtRequestMalformedCtypeHash.cTypeHash = {
      hash: [
        builtRequestMalformedCtypeHash.cTypeHash.hash.slice(0, 15),
        (
          (parseInt(
            builtRequestMalformedCtypeHash.cTypeHash.hash.charAt(15),
            16
          ) +
            1) %
          16
        ).toString(16),
        builtRequestMalformedCtypeHash.cTypeHash.hash.slice(16),
      ].join(''),
      nonce: builtRequestMalformedCtypeHash.cTypeHash.nonce,
    }
    builtRequestMalformedCtypeHash.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](
      builtRequestMalformedCtypeHash.claimOwner,
      builtRequestMalformedCtypeHash.cTypeHash,
      builtRequestMalformedCtypeHash.claimHashTree,
      builtRequestMalformedCtypeHash.legitimations,
      builtRequestMalformedCtypeHash.delegationId
    )
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestNoLegitimations)
    ).toThrowError(ERROR_LEGITIMATIONS_NOT_PROVIDED())
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestMalformedRootHash)
    ).toThrowError(ERROR_ROOT_HASH_UNVERIFIABLE())
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestMalformedClaimOwner)
    ).toThrowError(
      ERROR_NONCE_HASH_INVALID(
        builtRequestMalformedClaimOwner.claimOwner,
        'Claim owner'
      )
    )
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestIncompleteClaimHashTree)
    ).toThrowError(ERROR_CLAIM_HASHTREE_MALFORMED())
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestMalformedSignature)
    ).toThrowError(ERROR_SIGNATURE_UNVERIFIABLE())
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestMalformedCtypeHash)
    ).toThrowError(
      ERROR_NONCE_HASH_INVALID(
        builtRequestMalformedCtypeHash.cTypeHash,
        'CType'
      )
    )
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequest)
    ).not.toThrow()
    expect(() => {
      RequestForAttestationUtils.errorCheck(builtRequestWithLegitimation)
    }).not.toThrow()
  })
  it('checks Object instantiation', async () => {
    const builtRequest = await buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    expect(builtRequest instanceof RequestForAttestation).toEqual(true)
  })
})

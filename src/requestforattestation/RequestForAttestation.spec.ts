/* eslint-disable dot-notation */
import {
  AttesterAttestationSession,
  ClaimerAttestationSession,
} from '@kiltprotocol/portablegabi'
import { hexToU8a } from '@polkadot/util'
import Attestation from '../attestation/Attestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import { u8aToHex } from '../crypto'
import CType from '../ctype/CType'
import {
  ErrorCode,
  ERROR_LEGITIMATIONS_NOT_PROVIDED,
  ERROR_ROOT_HASH_UNVERIFIABLE,
  ERROR_SIGNATURE_UNVERIFIABLE,
  SDKError,
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

  const testCType: CType = CType.fromSchema(rawCType, identityAlice.address)

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimer.address,
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
    owner: claimer.address,
  }
  // build request for attestation with legitimations
  const { message: request } = await RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    {
      legitimations,
    }
  )
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
    delete request.claimNonceMap[Object.keys(request.claimNonceMap)[0]]
    expect(() => request.verifyData())
      .toThrowError
      // TODO: fix error type
      // ERROR_ROOT_HASH_UNVERIFIABLE()
      ()
  })

  it('verify request for attestation (PE)', async () => {
    const identityBobWithPE = await Identity.buildFromURI('//Bob', {
      peEnabled: true,
    })
    const [
      request,
      claimerSession,
      attester,
      attesterSession,
    ] = await buildRequestForAttestationPE(
      identityBobWithPE,
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
    delete request.claimHashes[0]
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

    request.claimNonceMap[Object.keys(request.claimNonceMap)[0]] = '1234'
    expect(() => {
      RequestForAttestation.verifyData(request)
    }).toThrow()
  })

  it('hides the claim owner', async () => {
    const request = await buildRequestForAttestation(identityBob, {}, [])
    request.removeClaimOwner()
    expect(Object.keys(request.claimNonceMap)).toHaveLength(
      request.claimHashes.length - 1
    )
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
        legitimationCharlie.request.claimNonceMap,
        legitimationCharlie.request.claimerSignature,
        legitimationCharlie.request.claimHashes,
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
        legitimationBob.request.claimNonceMap,
        legitimationBob.request.claimerSignature,
        legitimationBob.request.claimHashes,
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
      reqForAtt.claimNonceMap,
      reqForAtt.claimerSignature,
      reqForAtt.claimHashes,
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
    delete reqForAtt.claim.owner

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
    expect(Object.keys(request.claimNonceMap)).toHaveLength(
      request.claimHashes.length - 1
    )
    expect((request.claim.contents as any).b).toBe('b')
    expect(request.verifyData()).toBe(true)
    expect(request.verifyRootHash()).toBe(true)
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
    const deletedKey = Object.keys(
      builtRequestIncompleteClaimHashTree.claimNonceMap
    )[0]
    delete builtRequestIncompleteClaimHashTree.claimNonceMap[deletedKey]
    builtRequestIncompleteClaimHashTree.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](builtRequestIncompleteClaimHashTree)
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
    const signatureAsBytes = hexToU8a(
      builtRequestMalformedSignature.claimerSignature
    )
    signatureAsBytes[5] += 1
    builtRequestMalformedSignature.claimerSignature = u8aToHex(signatureAsBytes)
    builtRequestMalformedSignature.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](builtRequestMalformedSignature)
    const builtRequestMalformedHashes = {
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
    Object.entries(builtRequestMalformedHashes.claimNonceMap).forEach(
      ([hash, nonce]) => {
        const scrambledHash = [
          hash.slice(0, 15),
          ((parseInt(hash.charAt(15), 16) + 1) % 16).toString(16),
          hash.slice(16),
        ].join('')
        builtRequestMalformedHashes.claimNonceMap[scrambledHash] = nonce
        delete builtRequestMalformedHashes.claimNonceMap[hash]
      }
    )
    builtRequestMalformedHashes.rootHash = RequestForAttestation[
      'calculateRootHash'
    ](builtRequestMalformedHashes)
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestNoLegitimations)
    ).toThrowError(ERROR_LEGITIMATIONS_NOT_PROVIDED())
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestMalformedRootHash)
    ).toThrowError(ERROR_ROOT_HASH_UNVERIFIABLE())
    expect(
      (() => {
        try {
          RequestForAttestationUtils.errorCheck(
            builtRequestIncompleteClaimHashTree
          )
        } catch (e) {
          return e
        }
        return null
      })()
    ).toMatchObject<Partial<SDKError>>({
      errorCode: ErrorCode.ERROR_NO_PROOF_FOR_STATEMENT,
    })
    expect(() =>
      RequestForAttestationUtils.errorCheck(builtRequestMalformedSignature)
    ).toThrowError(ERROR_SIGNATURE_UNVERIFIABLE())
    expect(
      (() => {
        try {
          RequestForAttestationUtils.errorCheck(builtRequestMalformedHashes)
        } catch (e) {
          return e
        }
        return null
      })()
    ).toMatchObject<Partial<SDKError>>({
      errorCode: ErrorCode.ERROR_NO_PROOF_FOR_STATEMENT,
    })
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

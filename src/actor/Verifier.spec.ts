import {
  Attester,
  Claimer,
  CombinedPresentation,
  CType,
  ICType,
  IRequestForAttestation,
  Verifier,
} from '..'
import { mockChainQueryReturn } from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import Credential from '../credential/Credential'
import AttesterIdentity from '../identity/AttesterIdentity'
import Identity from '../identity/Identity'
import Message, { MessageBodyType } from '../messaging/Message'
import constants from '../test/constants'
import IClaim from '../types/Claim'
import {
  ERROR_PE_VERIFICATION,
  ERROR_MESSAGE_TYPE,
} from '../errorhandling/SDKErrors'
import { factory as LoggerFactory } from '../config/ConfigLog'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Verifier', () => {
  let attester: AttesterIdentity
  let claimer: Identity
  let verifier: Identity
  let cType: CType
  let claim: IClaim
  let credentialPE: Credential
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    claimer = await Identity.buildFromURI('//bob', { peEnabled: true })
    verifier = await Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      peEnabled: true,
    })

    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Verifier',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    cType = CType.fromSchema(rawCType, claimer.address)

    claim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }

    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        '"0xde9f624875aa620d06434603787a40c8cd02cc25c7b775cf50de8a3a96bbeafa"', // ctype hash
        attester.address, // Account
        undefined, // delegation-id?
        false, // revoked flag
      ])
    )

    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )

    const {
      message: requestAttestation,
      session: claimerSession,
    } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )
    expect(requestAttestation.body.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    if (
      requestAttestation.body.type ===
        MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM &&
      !Array.isArray(requestAttestation.body.content)
    ) {
      expect(
        requestAttestation.body.content.requestForAttestation.privacyEnhancement
      ).toBeDefined()
      if (
        requestAttestation.body.content.requestForAttestation
          .privacyEnhancement !== null
      ) {
        expect(
          requestAttestation.body.content.requestForAttestation.privacyEnhancement.getClaim()
        ).toEqual({
          claim: {
            cTypeHash: claim.cTypeHash,
            contents: claim.contents,
            owner: claim.owner,
          },
        })
      }
    }

    const {
      message: attestationMessage,
      revocationHandle,
    } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity(),
      attersterSession,
      true
    )
    expect(revocationHandle.witness).not.toBeNull()

    credentialPE = await Claimer.buildCredential(
      claimer,
      attestationMessage,
      claimerSession
    )
  })

  it('request privacy enhanced presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true, verifier, claimer.getPublicIdentity())
    expect(session).toBeDefined()
    expect(session.requestedProperties[0].properties).not.toContain(
      'legitimation'
    )
    expect(session.requestedProperties[0].properties).not.toContain(
      'delegation'
    )
    expect(request.body.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    if (request.body.type === MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      expect(request.body.content.allowPE).toBeTruthy()
      expect(request.body.content.peRequest).toBeDefined()
      expect(request.body.content.ctypes).toEqual(['this is a ctype hash'])
    }
  })
  it('request privacy enhanced presentation w/ legitimations and delegation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        properties: ['name', 'and', 'other', 'attributes'],
        legitimations: true,
        delegation: true,
      })
      .finalize(true, verifier, claimer.getPublicIdentity())
    expect(session).toBeDefined()
    expect(session.requestedProperties[0].properties).not.toContain(
      'claim.cTypeHash'
    )
    expect(session.requestedProperties[0].properties).toContain('delegationId')
    expect(session.requestedProperties[0].properties).toContain('legitimation')
    expect(request.body.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    if (request.body.type === MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      expect(request.body.content.allowPE).toBeTruthy()
      expect(request.body.content.peRequest).toBeDefined()
      expect(request.body.content.ctypes).toEqual([null])
    }
  })

  it('request public presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false, verifier, claimer.getPublicIdentity())
    expect(session).toBeDefined()
    expect(request.body.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    if (request.body.type === MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      expect(request.body.content.allowPE).toBeFalsy()
      expect(request.body.content.peRequest).toBeDefined()
      expect(request.body.content.ctypes).toEqual(['this is a ctype hash'])
    }
  })

  it('verify privacy enhanced presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true, verifier, claimer.getPublicIdentity())

    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE],
      [attester.getPublicIdentity()]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE
    )
    expect(presentation.body.content).toBeInstanceOf(CombinedPresentation)

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session,
      [await Attester.buildAccumulator(attester)],
      [attester.getPublicIdentity()]
    )
    expect(ok).toBeTruthy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(1)
    const { owner, ...unownedClaim } = claim
    expect(owner).toBeDefined()
    expect((claims[0] as IRequestForAttestation).claim).toEqual(unownedClaim)
  })
  it('should throw ... during privacy enhanced presentation', async () => {
    const accumulator = await Attester.buildAccumulator(attester)
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(true, verifier, claimer.getPublicIdentity())

    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE],
      [attester.getPublicIdentity()]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE
    )
    expect(presentation.body.content).toBeInstanceOf(CombinedPresentation)

    // test throw for public verification
    const log = LoggerFactory.getLogger('Verifier')
    const spy = jest.spyOn(log, 'info')
    const publicPresentation = {
      ...presentation,
      ...{
        // set public type and remove attestedClaims
        body: {
          type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC,
          content: [],
        },
      },
    }
    await expect(
      Verifier.verifyPresentation(
        (publicPresentation as unknown) as Message,
        session,
        [accumulator],
        [attester.getPublicIdentity()]
      )
    ).resolves.toStrictEqual({
      claims: [],
      verified: false,
    })
    expect(spy).toHaveBeenCalledWith(
      'Rejected presentation because number of attested claims (0) did not match number of requested claims (1).'
    )

    // PE presentation with missing accumulator(s) but existing attester gabi key(s)
    await expect(
      Verifier.verifyPresentation(presentation, session, undefined, [
        attester.getPublicIdentity(),
      ])
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(true, false))
    await expect(
      Verifier.verifyPresentation(
        presentation,
        session,
        [],
        [attester.getPublicIdentity()]
      )
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(true, false))

    // PE presentation with existing accumulator(s) but missing attester gabi key(s)
    await expect(
      Verifier.verifyPresentation(
        presentation,
        session,
        [accumulator],
        undefined
      )
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(false, true))
    await expect(
      Verifier.verifyPresentation(presentation, session, [accumulator], [])
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(false, true))

    // PE presentation with missing both accumulator(s) and attester gabi key(s)
    await expect(
      Verifier.verifyPresentation(presentation, session, [], [])
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(true, true))
    await expect(
      Verifier.verifyPresentation(presentation, session, undefined, [])
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(true, true))
    await expect(
      Verifier.verifyPresentation(presentation, session, [], undefined)
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(true, true))
    await expect(
      Verifier.verifyPresentation(presentation, session, undefined, undefined)
    ).rejects.toThrowError(ERROR_PE_VERIFICATION(true, true))

    // PE presentation with incorrect message body type
    await expect(
      Verifier.verifyPresentation(
        {
          body: {
            type: MessageBodyType.SUBMIT_TERMS,
          },
        } as Message,
        session,
        [],
        [attester.getPublicIdentity()]
      )
    ).rejects.toThrowError(
      ERROR_MESSAGE_TYPE(
        MessageBodyType.SUBMIT_TERMS,
        MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC,
        MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE
      )
    )
  })

  it('verify forbidden privacy enhanced presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false, verifier, claimer.getPublicIdentity())
    if (request.body.type !== MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      throw new Error('should never happen. Only a type check...')
    }
    request.body.content.allowPE = true
    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE],
      [attester.getPublicIdentity()]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE
    )
    expect(presentation.body.content).toBeInstanceOf(CombinedPresentation)

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session,
      [await Attester.buildAccumulator(attester)],
      [attester.getPublicIdentity()]
    )
    expect(ok).toBeFalsy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(0)
  })

  it('verify public-only presentation all good', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false, verifier, claimer.getPublicIdentity())

    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE],
      [attester.getPublicIdentity()],
      false
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session,
      [await Attester.buildAccumulator(attester)],
      [attester.getPublicIdentity()]
    )
    expect(ok).toBeTruthy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(1)
  })

  it('verify public-only presentation missing property', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(false, verifier, claimer.getPublicIdentity())

    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE],
      [attester.getPublicIdentity()],
      false
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()
    if (
      presentation.body.type ===
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC
    ) {
      delete presentation.body.content[0].request.claim.contents.name
      const { verified: ok, claims } = await Verifier.verifyPresentation(
        presentation,
        session,
        [await Attester.buildAccumulator(attester)],
        [attester.getPublicIdentity()]
      )
      expect(ok).toBeFalsy()
      expect(Array.isArray(claims)).toBeTruthy()
      expect(claims.length).toEqual(0)
    }
  })
})

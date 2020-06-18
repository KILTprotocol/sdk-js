import { Text, TypeRegistry } from '@polkadot/types'
import { Option, Tuple } from '@polkadot/types/codec'
import AccountId from '@polkadot/types/generic/AccountId'
import Bool from '@polkadot/types/primitive/Bool'
import {
  Attester,
  Claimer,
  CombinedPresentation,
  CType,
  ICType,
  Verifier,
} from '..'
import Credential from '../credential/Credential'
import AttesterIdentity from '../identity/AttesterIdentity'
import Identity from '../identity/Identity'
import { MessageBodyType } from '../messaging/Message'
import constants from '../test/constants'
import IClaim from '../types/Claim'

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
  const registry = new TypeRegistry()

  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    claimer = await Identity.buildFromURI('//bob')
    verifier = await Identity.buildFromMnemonic()

    const rawCType: ICType['schema'] = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    cType = CType.fromSchema(rawCType, claimer.getAddress())

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
      new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          [Text, AccountId, Text, Bool],
          ['0xdead', attester.getAddress(), undefined, 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
        )
      )
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
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
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
    expect(request.body.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    if (request.body.type === MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      expect(request.body.content.allowPE).toBeTruthy()
      expect(request.body.content.peRequest).toBeDefined()
      expect(request.body.content.ctypes).toEqual(['this is a ctype hash'])
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
    expect(claims[0].claim).toEqual(unownedClaim)
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

  it('verify public-only presentation', async () => {
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
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC
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
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()
    if (
      presentation.body.type === MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC
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

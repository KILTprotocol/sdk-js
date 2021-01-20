/**
 * @packageDocumentation
 * @group unit/actor
 * @ignore
 */

import {
  CType,
  IClaim,
  ICType,
  Identity,
  MessageBodyType,
} from '@kiltprotocol/core'
import { mockChainQueryReturn } from '@kiltprotocol/core/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { Attester, Claimer, Verifier } from '..'
import Credential from '../credential/Credential'

jest.mock(
  '@kiltprotocol/core/lib/blockchainApiConnection/BlockchainApiConnection'
)

describe('Verifier', () => {
  let attester: Identity
  let claimer: Identity
  let verifier: Identity
  let cType: CType
  let claim: IClaim
  let credentialPE: Credential
  const blockchainApi = require('@kiltprotocol/core/lib/blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  beforeAll(async () => {
    attester = Identity.buildFromURI('//Alice')

    claimer = Identity.buildFromURI('//bob')
    verifier = Identity.buildFromMnemonic(Identity.generateMnemonic())

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

    // const {
    //   message: initAttestation,
    //   session: attersterSession,
    // } = await Attester.initiateAttestation(
    //   attester,
    //   claimer.getPublicIdentity()
    // )

    const {
      message: requestAttestation,
      session: claimerSession,
    } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity()
    )
    expect(requestAttestation.body.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    if (
      requestAttestation.body.type ===
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    ) {
      const { message: attestationMessage } = await Attester.issueAttestation(
        attester,
        requestAttestation,
        claimer.getPublicIdentity()
      )

      credentialPE = await Claimer.buildCredential(
        claimer,
        attestationMessage,
        claimerSession
      )
    }
  })

  it('request public presentation', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(verifier, claimer.getPublicIdentity())
    expect(session).toBeDefined()
    expect(request.body.type).toEqual(MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES)
    if (request.body.type === MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      expect(request.body.content.ctypes).toEqual(['this is a ctype hash'])
    }
  })

  it('verify public-only presentation all good', async () => {
    const { session, message: request } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(verifier, claimer.getPublicIdentity())

    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session
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
      .finalize(verifier, claimer.getPublicIdentity())

    const presentation = await Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credentialPE]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()
    if (presentation.body.type === MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES) {
      delete presentation.body.content[0].request.claim.contents.name
      const { verified: ok, claims } = await Verifier.verifyPresentation(
        presentation,
        session
      )
      expect(ok).toBeFalsy()
      expect(Array.isArray(claims)).toBeTruthy()
      expect(claims.length).toEqual(0)
    }
  })
})

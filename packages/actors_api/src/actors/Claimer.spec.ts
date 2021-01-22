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
  IRequestClaimsForCTypes,
  ISubmitClaimsForCTypes,
  Message,
  MessageBodyType,
  SDKErrors,
} from '@kiltprotocol/core'
import { mockChainQueryReturn } from '@kiltprotocol/core/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { Attester, Claimer, Verifier } from '..'
import Credential from '../credential/Credential'
import { ClaimerAttestationSession } from './Claimer'

jest.mock(
  '@kiltprotocol/core/lib/blockchainApiConnection/BlockchainApiConnection'
)

describe('Claimer', () => {
  const blockchainApi = require('@kiltprotocol/core/lib/blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let attester: Identity
  let claimer: Identity
  let verifier: Identity
  let cType: CType
  let claim: IClaim
  let credential: Credential

  beforeAll(async () => {
    attester = Identity.buildFromURI('//Alice')

    claimer = Identity.buildFromURI('//Bob')
    verifier = Identity.buildFromMnemonic(Identity.generateMnemonic())

    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Claimer',
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
        cType.hash,
        attester.address,
        undefined,
        0,
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
    } = Claimer.requestAttestation(claim, claimer, attester.getPublicIdentity())
    expect(requestAttestation.body.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    const { message: attestationMessage } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )

    credential = Claimer.buildCredential(attestationMessage, claimerSession)
  })

  it('request only public attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        cType.hash,
        attester.address,
        undefined,
        0,
      ])
    )

    const {
      message: requestAttestation,
      session: claimerSession,
    } = Claimer.requestAttestation(claim, claimer, attester.getPublicIdentity())

    expect(requestAttestation.body.type).toEqual(
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    const { message: attestationMessage } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )

    Claimer.buildCredential(attestationMessage, claimerSession)
  })

  it('create public presentation', async () => {
    const { message: request } = Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: 'this is a ctype hash',
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(verifier, claimer.getPublicIdentity())

    const presentation = Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credential]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
    expect(Array.isArray(presentation.body.content)).toBe(true)
  })
  it('create public presentation from request without peRequest', async () => {
    const body: IRequestClaimsForCTypes = {
      type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
      content: {
        ctypes: ['this is a ctype hash'],
      },
    }
    const request = new Message(body, verifier, claimer.getPublicIdentity())

    const presentation = Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credential]
    )
    expect(presentation.body.type).toEqual(
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
    expect(Array.isArray(presentation.body.content)).toBe(true)
    const { content } = presentation.body as ISubmitClaimsForCTypes
    expect(Object.keys(content[0].request.claimHashes)).toHaveLength(
      Object.keys(content[0].request.claim.contents).length + 1
    )
  })
  describe('Negative tests', () => {
    describe('create presentation', () => {
      // fakes the input for Claimer.createPresentation
      const fakePresentation = ({
        messageBody = MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
        allowPE = false,
        credentials = [],
      }: {
        messageBody?: MessageBodyType
        allowPE?: boolean
        credentials?: Credential[]
      }): Message => {
        return Claimer.createPresentation(
          claimer,
          ({
            body: {
              type: messageBody, // should be default value
              content: { allowPE },
            },
          } as unknown) as Message,
          verifier.getPublicIdentity(),
          credentials
        )
      }
      it('Should throw when message body type does not match', () => {
        return expect(() =>
          fakePresentation({
            messageBody: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
          })
        ).toThrowError(
          SDKErrors.ERROR_MESSAGE_TYPE(
            MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
            MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES
          )
        )
      })
      it('Should throw when message body type does not match in buildCredential', () => {
        return expect(() =>
          Claimer.buildCredential(
            {
              body: {
                type: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
              },
            } as Message,
            {} as ClaimerAttestationSession
          )
        ).toThrowError(
          SDKErrors.ERROR_MESSAGE_TYPE(
            MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
            MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
          )
        )
      })
    })
  })
})

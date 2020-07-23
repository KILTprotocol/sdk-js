import {
  Attester,
  Claimer,
  CombinedPresentation,
  CType,
  IClaim,
  ICType,
  Verifier,
} from '..'
import { mockChainQueryReturn } from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import Credential from '../credential/Credential'
import {
  ERROR_MESSAGE_TYPE,
  ERROR_PE_CREDENTIAL_MISSING,
  ERROR_PE_MISMATCH,
  ERROR_IDENTITY_NOT_PE_ENABLED,
  ERROR_PE_MISSING,
} from '../errorhandling/SDKErrors'
import AttesterIdentity from '../identity/AttesterIdentity'
import Identity from '../identity/Identity'
import Message, {
  MessageBodyType,
  IRequestClaimsForCTypes,
  ISubmitClaimsForCTypesClassic,
} from '../messaging/Message'
import constants from '../test/constants'
import { ClaimerAttestationSession } from './Claimer'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Claimer', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let attester: AttesterIdentity
  let claimer: Identity
  let verifier: Identity
  let cType: CType
  let claim: IClaim
  let credentialPE: Credential

  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    claimer = await Identity.buildFromURI('//Bob', { peEnabled: true })
    verifier = await Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      peEnabled: true,
    })

    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Claimer',
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
      mockChainQueryReturn('attestation', 'attestations', [
        cType.hash,
        attester.getAddress(),
        undefined,
        0,
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

  it('request privacy enhanced attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        cType.hash,
        attester.getAddress(),
        undefined,
        0,
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

    const attestedClaim = await Claimer.buildCredential(
      claimer,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.privacyCredential).toBeDefined()
  })

  it('request only public attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        cType.hash,
        attester.getAddress(),
        undefined,
        0,
      ])
    )

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
      expect(
        requestAttestation.body.content.requestForAttestation.privacyEnhancement
      ).toBeNull()
    }
    const {
      message: attestationMessage,
      revocationHandle,
    } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    expect(revocationHandle.witness).toBeNull()

    const attestedClaim = await Claimer.buildCredential(
      claimer,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.privacyCredential).toBeNull()
  })

  it('create privacy enhanced presentation', async () => {
    const { message: request } = await Verifier.newRequestBuilder()
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
  })

  it('create public presentation', async () => {
    const { message: request } = await Verifier.newRequestBuilder()
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
    expect(Array.isArray(presentation.body.content)).toBe(true)
  })
  it('create public presentation from request without peRequest', async () => {
    const body: IRequestClaimsForCTypes = {
      type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
      content: {
        allowPE: false,
        ctypes: ['this is a ctype hash'],
      },
    }
    const request = new Message(body, verifier, claimer.getPublicIdentity())

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
    expect(Array.isArray(presentation.body.content)).toBe(true)
    const { content } = presentation.body as ISubmitClaimsForCTypesClassic
    expect(Object.keys(content[0].request.claim.contents)).toEqual(
      Object.keys(content[0].request.claimHashTree)
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
      }): Promise<Message> => {
        return Claimer.createPresentation(
          claimer,
          ({
            body: {
              type: messageBody, // should be default value
              content: { allowPE },
            },
          } as unknown) as Message,
          verifier.getPublicIdentity(),
          credentials,
          [],
          true
        )
      }
      it('Should throw when message body type does not match', () => {
        return expect(
          fakePresentation({
            messageBody: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
          })
        ).rejects.toThrowError(
          ERROR_MESSAGE_TYPE(
            MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
            MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES
          )
        )
      })
      it('Should throw when PE is required but not allowed', () => {
        return expect(fakePresentation({})).rejects.toThrowError(
          ERROR_PE_MISMATCH()
        )
      })
      it('Should throw when PE is allowed and required but credentials have nulls', () => {
        return expect(
          fakePresentation({
            allowPE: true,
            credentials: [
              ({ privacyCredential: null } as unknown) as Credential,
            ],
          })
        ).rejects.toThrowError(ERROR_PE_CREDENTIAL_MISSING())
      })
      it('Should throw, if PE is allowed, but claimer has no PE-enabled identity', async () => {
        const claimerWithoutPE = await Identity.buildFromURI('//Bob', {
          peEnabled: false,
        })
        const { message: request } = await Verifier.newRequestBuilder()
          .requestPresentationForCtype({
            ctypeHash: 'this is a ctype hash',
            properties: ['name', 'and', 'other', 'attributes'],
          })
          .finalize(true, verifier, claimer.getPublicIdentity())

        await expect(
          Claimer.createPresentation(
            claimerWithoutPE,
            request,
            verifier.getPublicIdentity(),
            [credentialPE],
            [attester.getPublicIdentity()],
            false
          )
        ).rejects.toThrowError(ERROR_IDENTITY_NOT_PE_ENABLED())
      })
    })
    it('Should throw, if PE is allowed and required, but peRequest is missing', async () => {
      const claimerWithoutPE = await Identity.buildFromURI('//Bob', {
        peEnabled: false,
      })
      const { message: request } = await Verifier.newRequestBuilder()
        .requestPresentationForCtype({
          ctypeHash: 'this is a ctype hash',
          properties: ['name', 'and', 'other', 'attributes'],
        })
        .finalize(true, verifier, claimer.getPublicIdentity())

      await expect(
        Claimer.createPresentation(
          claimerWithoutPE,
          request,
          verifier.getPublicIdentity(),
          [credentialPE],
          [attester.getPublicIdentity()],
          false
        )
      ).rejects.toThrowError(ERROR_IDENTITY_NOT_PE_ENABLED())
    })
    it('Should throw when PE is allowed, but peRequest is missing in the request message', async () => {
      const body: IRequestClaimsForCTypes = {
        type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
        content: {
          allowPE: true,
          ctypes: ['this is a ctype hash'],
        },
      }
      const request = new Message(body, verifier, claimer.getPublicIdentity())

      await expect(
        Claimer.createPresentation(
          claimer,
          request,
          verifier.getPublicIdentity(),
          [credentialPE],
          [attester.getPublicIdentity()]
        )
      ).rejects.toThrowError(ERROR_PE_MISSING())
    })
    it('Should throw when message body type does not match in requestAttestation', () => {
      return expect(
        Claimer.requestAttestation(
          (undefined as unknown) as IClaim,
          attester,
          attester.getPublicIdentity(),
          {
            initiateAttestationMsg: {
              body: {
                type: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
              },
            } as Message,
          }
        )
      ).rejects.toThrowError(
        ERROR_MESSAGE_TYPE(
          MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
          MessageBodyType.INITIATE_ATTESTATION
        )
      )
    })
    it('Should throw when message body type does not match in buildCredential', () => {
      return expect(
        Claimer.buildCredential(
          attester,
          {
            body: {
              type: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
            },
          } as Message,
          {} as ClaimerAttestationSession
        )
      ).rejects.toThrowError(
        ERROR_MESSAGE_TYPE(
          MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
          MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
        )
      )
    })
    it('Should throw, when claimer tries to make a request for attestation, without a PE-enabled identity', async () => {
      blockchainApi.query.attestation.attestations.mockReturnValue(
        mockChainQueryReturn('attestation', 'attestations', [
          cType.hash,
          attester.getAddress(),
          undefined,
          0,
        ])
      )

      const claimerWithoutPE = await Identity.buildFromURI('//Bob', {
        peEnabled: false,
      })

      const { message: initAttestation } = await Attester.initiateAttestation(
        attester,
        claimerWithoutPE.getPublicIdentity()
      )

      await expect(
        Claimer.requestAttestation(
          claim,
          claimerWithoutPE,
          attester.getPublicIdentity(),
          {
            initiateAttestationMsg: initAttestation,
          }
        )
      ).rejects.toThrowError(ERROR_IDENTITY_NOT_PE_ENABLED())
    })

    it('Should throw, when claimer tries to make a credential, without a PE-enabled identity', async () => {
      blockchainApi.query.attestation.attestations.mockReturnValue(
        mockChainQueryReturn('attestation', 'attestations', [
          cType.hash,
          attester.getAddress(),
          undefined,
          0,
        ])
      )

      const claimerWithoutPE = await Identity.buildFromURI('//Bob', {
        peEnabled: false,
      })

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

      const { message: attestationMessage } = await Attester.issueAttestation(
        attester,
        requestAttestation,
        claimer.getPublicIdentity(),
        attersterSession,
        true
      )

      await expect(
        Claimer.buildCredential(claimer, attestationMessage, claimerSession)
      ).resolves.toBeTruthy()

      await expect(
        Claimer.buildCredential(
          claimerWithoutPE,
          attestationMessage,
          claimerSession
        )
      ).rejects.toThrowError(ERROR_IDENTITY_NOT_PE_ENABLED())
    })
  })
})

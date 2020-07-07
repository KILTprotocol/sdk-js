import { TypeRegistry } from '@polkadot/types'
import { Option, Tuple } from '@polkadot/types/codec'
import AccountId from '@polkadot/types/generic/AccountId'
import Bool from '@polkadot/types/primitive/Bool'
import {
  Attester,
  Claimer,
  CombinedPresentation,
  CType,
  IClaim,
  ICType,
  Verifier,
} from '..'
import Credential from '../credential/Credential'
import {
  ERROR_MESSAGE_TYPE,
  ERROR_PE_CREDENTIAL_MISSING,
  ERROR_PE_MISMATCH,
} from '../errorhandling/SDKErrors'
import AttesterIdentity from '../identity/AttesterIdentity'
import Identity from '../identity/Identity'
import Message, { MessageBodyType } from '../messaging/Message'
import constants from '../test/constants'
import { ClaimerAttestationSession } from './Claimer'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Claimer', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  const registry = new TypeRegistry()
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

    claimer = await Identity.buildFromURI('//bob')
    verifier = await Identity.buildFromMnemonic()

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
      new Option(
        registry,
        Tuple.with(['H256', AccountId, 'Option<H256>', Bool]),
        [cType.hash, attester.getAddress(), undefined, 0]
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

  it('request privacy enhanced attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        registry,
        Tuple.with(['H256', AccountId, 'Option<H256>', Bool]),
        [cType.hash, attester.getAddress(), undefined, 0]
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

    const attestedClaim = await Claimer.buildCredential(
      claimer,
      attestationMessage,
      claimerSession
    )
    expect(attestedClaim.privacyCredential).toBeDefined()
  })

  it('request only public attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        registry,
        Tuple.with(['H256', AccountId, 'Option<H256>', Bool]),
        [cType.hash, attester.getAddress(), undefined, 0]
      )
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
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC
    )
    expect(Array.isArray(presentation.body.content))
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
      it('Should throw when PE is required but not allowed', () => {
        return expect(fakePresentation({})).rejects.toThrowError(
          ERROR_PE_MISMATCH()
        )
      })
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
  })
})

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import type {
  CompressedQuoteAttesterSigned,
  CompressedQuoteAgreed,
  ICType,
  IClaim,
  IDidResolver,
  IQuote,
  IQuoteAttesterSigned,
  IQuoteAgreement,
  IRequestTerms,
  ISubmitTerms,
  ITerms,
  IRejectTerms,
  IRequestAttestationForClaim,
  ISubmitAttestationForClaim,
  IRequestClaimsForCTypes,
  IAttestedClaim,
  IRequestAcceptDelegation,
  ISubmitAcceptDelegation,
  IRejectAcceptDelegation,
  IInformCreateDelegation,
  MessageBody,
  CompressedRequestTerms,
  CompressedPartialClaim,
  CompressedSubmitTerms,
  CompressedTerms,
  CompressedRejectTerms,
  CompressedRejectedTerms,
  IRequestAttestationForClaimContent,
  CompressedRequestAttestationForClaim,
  CompressedRequestAttestationForClaimContent,
  ISubmitAttestationForClaimContent,
  CompressedSubmitAttestationForClaim,
  IRequestClaimsForCTypesContent,
  CompressedRequestClaimsForCTypes,
  IRequestDelegationApproval,
  CompressedRequestAcceptDelegation,
  CompressedRequestDelegationApproval,
  ISubmitDelegationApproval,
  CompressedSubmitAcceptDelegation,
  CompressedSubmitDelegationApproval,
  IDelegationData,
  CompressedRejectAcceptDelegation,
  CompressedDelegationData,
  IInformDelegationCreation,
  CompressedInformCreateDelegation,
  CompressedInformDelegationCreation,
  CompressedMessageBody,
  CompressedAttestedClaim,
  CompressedSubmitClaimsForCTypes,
  ISubmitClaimsForCTypes,
  CompressedAttestation,
  PartialClaim,
  CompressedRequestClaimsForCTypesContent,
  IMessage,
  IRejectAttestationForClaim,
  IAcceptClaimsForCTypes,
  IRejectClaimsForCTypes,
  IDidDetails,
} from '@kiltprotocol/types'
import { SDKErrors, Crypto } from '@kiltprotocol/utils'
import {
  Attestation,
  AttestedClaim,
  Claim,
  CType,
  Quote,
  RequestForAttestation,
} from '@kiltprotocol/core'

import {
  createLocalDemoDidFromSeed,
  DemoKeystore,
  DidUtils,
} from '@kiltprotocol/did'
import * as MessageUtils from './Message.utils'

import Message from './Message'

import '../../../testingTools/jestErrorCodeMatcher'

// TODO: Duplicated code, would be nice to have as a seperated test package with similar helpers
async function buildAttestedClaim(
  claimer: IDidDetails,
  attester: IDidDetails,
  contents: IClaim['contents'],
  legitimations: AttestedClaim[]
): Promise<AttestedClaim> {
  // create claim

  const rawCType: ICType['schema'] = {
    $id: Crypto.hashStr('kilt:ctype:0x1'),
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Attested Claim',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType: CType = CType.fromSchema(rawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.did
  )
  // build request for attestation with legitimations
  const requestForAttestation = RequestForAttestation.fromClaim(claim, {
    legitimations,
  })
  // build attestation
  const testAttestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    attester.did
  )
  // combine to attested claim
  const attestedClaim = AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

describe('Messaging Utilities', () => {
  let keystore: DemoKeystore
  let identityAlice: IDidDetails
  let identityBob: IDidDetails
  let mockResolver: IDidResolver
  let date: Date
  let rawCType: ICType['schema']
  let rawCTypeWithMultipleProperties: ICType['schema']
  let testCType: CType
  let testCTypeWithMultipleProperties: CType
  let claim: Claim
  let claimContents: IClaim['contents']
  let quoteData: IQuote
  let quoteAttesterSigned: IQuoteAttesterSigned
  let bothSigned: IQuoteAgreement
  let compressedLegitimation: CompressedAttestedClaim
  let compressedResultAttesterSignedQuote: CompressedQuoteAttesterSigned
  let legitimation: AttestedClaim
  let compressedQuoteAgreement: CompressedQuoteAgreed
  let requestTermsBody: IRequestTerms
  let requestTermsContent: PartialClaim
  let compressedRequestTermsBody: CompressedRequestTerms
  let compressedRequestTermsContent: CompressedPartialClaim
  let submitTermsBody: ISubmitTerms
  let submitTermsContent: ITerms
  let compressedSubmitTermsBody: CompressedSubmitTerms
  let compressedSubmitTermsContent: CompressedTerms
  let rejectTermsBody: IRejectTerms
  let rejectTermsContent: Pick<
    ITerms,
    'claim' | 'legitimations' | 'delegationId'
  >
  let compressedRejectTermsBody: CompressedRejectTerms
  let compressedRejectTermsContent: CompressedRejectedTerms
  let requestAttestationBody: IRequestAttestationForClaim
  let requestAttestationContent: IRequestAttestationForClaimContent
  let compressedRequestAttestationBody: CompressedRequestAttestationForClaim
  let compressedRequestAttestationContent: CompressedRequestAttestationForClaimContent
  let submitAttestationContent: ISubmitAttestationForClaimContent
  let submitAttestationBody: ISubmitAttestationForClaim
  let compressedSubmitAttestationContent: CompressedAttestation
  let compressedSubmitAttestationBody: CompressedSubmitAttestationForClaim
  let rejectAttestationForClaimBody: IRejectAttestationForClaim
  let requestClaimsForCTypesBody: IRequestClaimsForCTypes
  let requestClaimsForCTypesContent: IRequestClaimsForCTypesContent
  let compressedRequestClaimsForCTypesBody: CompressedRequestClaimsForCTypes
  let compressedRequestClaimsForCTypesContent: CompressedRequestClaimsForCTypesContent
  let submitClaimsForCTypesBody: ISubmitClaimsForCTypes
  let submitClaimsForCTypesContent: IAttestedClaim[]
  let acceptClaimsForCTypesBody: IAcceptClaimsForCTypes
  let compressedSubmitClaimsForCTypesBody: CompressedSubmitClaimsForCTypes
  let compressedSubmitClaimsForCTypesContent: CompressedAttestedClaim[]
  let rejectClaimsForCTypesBody: IRejectClaimsForCTypes
  let requestAcceptDelegationBody: IRequestAcceptDelegation
  let requestAcceptDelegationContent: IRequestDelegationApproval
  let compressedRequestAcceptDelegationBody: CompressedRequestAcceptDelegation
  let compressedRequestAcceptDelegationContent: CompressedRequestDelegationApproval
  let submitAcceptDelegationBody: ISubmitAcceptDelegation
  let submitAcceptDelegationContent: ISubmitDelegationApproval
  let compressedSubmitAcceptDelegationBody: CompressedSubmitAcceptDelegation
  let compressedSubmitAcceptDelegationContent: CompressedSubmitDelegationApproval
  let rejectAcceptDelegationBody: IRejectAcceptDelegation
  let rejectAcceptDelegationContent: IDelegationData
  let compressedRejectAcceptDelegationBody: CompressedRejectAcceptDelegation
  let compressedRejectAcceptDelegationContent: CompressedDelegationData
  let informCreateDelegationBody: IInformCreateDelegation
  let informCreateDelegationContent: IInformDelegationCreation
  let compressedInformCreateDelegationBody: CompressedInformCreateDelegation
  let compressedInformCreateDelegationContent: CompressedInformDelegationCreation
  let messageRequestTerms: IMessage
  let messageSubmitTerms: IMessage
  let messageRejectTerms: IMessage
  let messageRequestAttestationForClaim: IMessage
  let messageSubmitAttestationForClaim: IMessage
  let messageRequestClaimsForCTypes: IMessage
  let messageRejectAttestationForClaim: IMessage
  let messageSubmitClaimsForCTypes: IMessage
  let messageAcceptClaimsForCTypes: IMessage
  let messageRejectClaimsForCTypes: IMessage
  let messageRequestAcceptDelegation: IMessage
  let messageSubmitAcceptDelegation: IMessage
  let messageRejectAcceptDelegation: IMessage
  let messageInformCreateDelegation: IMessage

  beforeAll(async () => {
    keystore = new DemoKeystore()
    identityAlice = await createLocalDemoDidFromSeed(keystore, '//Alice')
    identityBob = await createLocalDemoDidFromSeed(keystore, '//Bob')
    date = new Date(2019, 11, 10)
    claimContents = {
      name: 'Bob',
    }

    const resolveDoc = async (didUri: string) => {
      if (didUri === identityAlice.did) {
        return { details: identityAlice }
      }
      if (didUri === identityBob.did) {
        return { details: identityBob }
      }
      return null
    }

    const resolveKey = async (keyId: string) => {
      const { identifier, type, version, fragment } = DidUtils.parseDidUrl(
        keyId
      )
      const didSubject = DidUtils.getKiltDidFromIdentifier(
        identifier,
        type,
        version
      )
      if (didSubject === identityAlice.did) {
        return identityAlice.getKey(fragment!) || null
      }
      if (didSubject === identityBob.did) {
        return identityBob.getKey(fragment!) || null
      }
      return null
    }

    mockResolver = {
      resolveDoc,
      resolveKey,
      resolve: async (did: string) => {
        return resolveKey(did) || resolveDoc(did)
      },
    } as IDidResolver

    rawCTypeWithMultipleProperties = {
      $id: Crypto.hashStr('kilt:ctype:0x2'),
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Drivers license Claim',
      properties: {
        name: { type: 'string' },
        id: { type: 'string' },
        age: { type: 'string' },
      },
      type: 'object',
    }
    // CType Schema
    rawCType = {
      $id: Crypto.hashStr('kilt:ctype:0x1'),
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ClaimCtype',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
    // CType
    testCType = CType.fromSchema(rawCType, identityAlice.did)
    testCTypeWithMultipleProperties = CType.fromSchema(
      rawCTypeWithMultipleProperties,
      identityAlice.did
    )

    // Claim
    claim = Claim.fromCTypeAndClaimContents(
      testCType,
      claimContents,
      identityAlice.did
    )
    // Legitimation
    legitimation = await buildAttestedClaim(identityAlice, identityBob, {}, [])
    // Compressed Legitimation
    compressedLegitimation = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        legitimation.request.claimNonceMap,
        legitimation.request.claimerSignature,
        legitimation.request.claimHashes,
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
      ],
      [
        legitimation.attestation.claimHash,
        legitimation.attestation.cTypeHash,
        legitimation.attestation.owner,
        legitimation.attestation.revoked,
        legitimation.attestation.delegationId,
      ],
    ]
    // Quote Data
    quoteData = {
      attesterDid: identityAlice.did,
      cTypeHash: claim.cTypeHash,
      cost: {
        tax: { vat: 3.3 },
        net: 23.4,
        gross: 23.5,
      },
      currency: 'Euro',
      termsAndConditions: 'https://coolcompany.io/terms.pdf',
      timeframe: date,
    }
    // Quote signed by attester
    quoteAttesterSigned = await Quote.createAttesterSignature(
      quoteData,
      identityAlice,
      keystore
    )
    // Compressed Quote Attester Signed quote
    compressedResultAttesterSignedQuote = [
      quoteAttesterSigned.attesterDid,
      quoteAttesterSigned.cTypeHash,
      [
        quoteAttesterSigned.cost.gross,
        quoteAttesterSigned.cost.net,
        quoteAttesterSigned.cost.tax,
      ],
      quoteAttesterSigned.currency,
      quoteAttesterSigned.termsAndConditions,
      quoteAttesterSigned.timeframe,
      [
        quoteAttesterSigned.attesterSignature.signature,
        quoteAttesterSigned.attesterSignature.keyId,
      ],
    ]
    // Quote agreement
    bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      legitimation.request.rootHash,
      identityAlice.did,
      identityBob,
      keystore,
      mockResolver
    )
    // Compressed Quote Agreement
    compressedQuoteAgreement = [
      bothSigned.attesterDid,
      bothSigned.cTypeHash,
      [bothSigned.cost.gross, bothSigned.cost.net, bothSigned.cost.tax],
      bothSigned.currency,
      bothSigned.termsAndConditions,
      bothSigned.timeframe,
      [
        bothSigned.attesterSignature.signature,
        bothSigned.attesterSignature.keyId,
      ],
      [
        bothSigned.claimerSignature.signature,
        bothSigned.claimerSignature.keyId,
      ],
      bothSigned.rootHash,
    ]
    // Request Terms content
    requestTermsContent = {
      cTypeHash: claim.cTypeHash,
    }
    // Compressed Request terms content
    compressedRequestTermsContent = [claim.cTypeHash, undefined, undefined]
    // Submit Terms content
    submitTermsContent = {
      claim: {
        cTypeHash: claim.cTypeHash,
      },
      legitimations: [legitimation],
      delegationId: undefined,
      quote: quoteAttesterSigned,
      cTypes: undefined,
    }
    // Compressed Submit Terms Contentƒ
    compressedSubmitTermsContent = [
      compressedRequestTermsContent,
      [compressedLegitimation],
      undefined,
      compressedResultAttesterSignedQuote,
      undefined,
    ]
    // Reject terms Content
    rejectTermsContent = {
      claim: {
        cTypeHash: claim.cTypeHash,
      },
      legitimations: [legitimation],
    }
    // Compressed Reject terms content
    compressedRejectTermsContent = [
      compressedRequestTermsContent,
      [compressedLegitimation],
      undefined,
    ]

    // Request Attestation Content
    requestAttestationContent = {
      requestForAttestation: legitimation.request,
      quote: bothSigned,
    }

    // Compressed Request attestation content
    compressedRequestAttestationContent = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        legitimation.request.claimNonceMap,
        legitimation.request.claimerSignature,
        legitimation.request.claimHashes,
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
      ],
      compressedQuoteAgreement,
    ]

    // Submit Attestation content
    submitAttestationContent = {
      attestation: {
        delegationId: null,
        claimHash: requestAttestationContent.requestForAttestation.rootHash,
        cTypeHash: claim.cTypeHash,
        owner: identityBob.did,
        revoked: false,
      },
    }

    // Compressed Submit Attestation content
    compressedSubmitAttestationContent = [
      submitAttestationContent.attestation.claimHash,
      submitAttestationContent.attestation.cTypeHash,
      submitAttestationContent.attestation.owner,
      submitAttestationContent.attestation.revoked,
      submitAttestationContent.attestation.delegationId,
    ]
    // Request Claims for CTypes content
    requestClaimsForCTypesContent = {
      cTypes: [
        {
          cTypeHash: claim.cTypeHash,
          trustedAttesters: [identityAlice.did],
          requiredProperties: ['id', 'name'],
        },
      ],
      challenge: '1234',
    }
    // Compressed Request claims for CType content
    compressedRequestClaimsForCTypesContent = [
      [[claim.cTypeHash, [identityAlice.did], ['id', 'name']]],
      '1234',
    ]
    // Submit claims for CType content
    submitClaimsForCTypesContent = [legitimation]
    // Compressed Submit claims for CType content
    compressedSubmitClaimsForCTypesContent = [compressedLegitimation]
    // Request Accept delegation content
    requestAcceptDelegationContent = {
      delegationData: {
        account: identityAlice.did,
        id: Crypto.hashStr('0x12345678'),
        parentId: Crypto.hashStr('0x12345678'),
        permissions: [1],
        isPCR: false,
      },
      metaData: {},
      signatures: {
        inviter: await DidUtils.getDidAuthenticationSignature(
          'signature',
          identityAlice,
          keystore
        ),
      },
    }
    // Compressed Request accept delegation content
    compressedRequestAcceptDelegationContent = [
      [
        requestAcceptDelegationContent.delegationData.account,
        requestAcceptDelegationContent.delegationData.id,
        requestAcceptDelegationContent.delegationData.parentId,
        requestAcceptDelegationContent.delegationData.permissions,
        requestAcceptDelegationContent.delegationData.isPCR,
      ],
      [
        requestAcceptDelegationContent.signatures.inviter.signature,
        requestAcceptDelegationContent.signatures.inviter.keyId,
      ],
      requestAcceptDelegationContent.metaData,
    ]
    // Submit Accept delegation content
    submitAcceptDelegationContent = {
      delegationData: {
        account: identityAlice.did,
        id: Crypto.hashStr('0x12345678'),
        parentId: Crypto.hashStr('0x12345678'),
        permissions: [1],
        isPCR: false,
      },
      signatures: {
        inviter: await DidUtils.getDidAuthenticationSignature(
          'signature',
          identityAlice,
          keystore
        ),
        invitee: await DidUtils.getDidAuthenticationSignature(
          'signature',
          identityBob,
          keystore
        ),
      },
    }
    // Compressed Submit accept delegation content
    compressedSubmitAcceptDelegationContent = [
      [
        submitAcceptDelegationContent.delegationData.account,
        submitAcceptDelegationContent.delegationData.id,
        submitAcceptDelegationContent.delegationData.parentId,
        submitAcceptDelegationContent.delegationData.permissions,
        submitAcceptDelegationContent.delegationData.isPCR,
      ],
      [
        submitAcceptDelegationContent.signatures.inviter.signature,
        submitAcceptDelegationContent.signatures.inviter.keyId,
      ],
      [
        submitAcceptDelegationContent.signatures.invitee.signature,
        submitAcceptDelegationContent.signatures.invitee.keyId,
      ],
    ]
    // Reject Accept Delegation content
    rejectAcceptDelegationContent = {
      account: identityAlice.did,
      id: Crypto.hashStr('0x12345678'),
      parentId: Crypto.hashStr('0x12345678'),
      permissions: [1],
      isPCR: false,
    }
    // Compressed Reject accept delegation content
    compressedRejectAcceptDelegationContent = [
      rejectAcceptDelegationContent.account,
      rejectAcceptDelegationContent.id,
      rejectAcceptDelegationContent.parentId,
      rejectAcceptDelegationContent.permissions,
      rejectAcceptDelegationContent.isPCR,
    ]

    informCreateDelegationContent = {
      delegationId: Crypto.hashStr('0x12345678'),
      isPCR: false,
    }

    compressedInformCreateDelegationContent = [
      informCreateDelegationContent.delegationId,
      informCreateDelegationContent.isPCR,
    ]

    requestTermsBody = {
      content: requestTermsContent,
      type: Message.BodyType.REQUEST_TERMS,
    }

    compressedRequestTermsBody = [
      Message.BodyType.REQUEST_TERMS,
      compressedRequestTermsContent,
    ]

    submitTermsBody = {
      content: submitTermsContent,
      type: Message.BodyType.SUBMIT_TERMS,
    }

    compressedSubmitTermsBody = [
      Message.BodyType.SUBMIT_TERMS,
      compressedSubmitTermsContent,
    ]

    rejectTermsBody = {
      content: rejectTermsContent,
      type: Message.BodyType.REJECT_TERMS,
    }

    compressedRejectTermsBody = [
      Message.BodyType.REJECT_TERMS,
      compressedRejectTermsContent,
    ]

    requestAttestationBody = {
      content: requestAttestationContent,
      type: Message.BodyType.REQUEST_ATTESTATION,
    }

    compressedRequestAttestationBody = [
      Message.BodyType.REQUEST_ATTESTATION,
      compressedRequestAttestationContent,
    ]

    submitAttestationBody = {
      content: submitAttestationContent,
      type: Message.BodyType.SUBMIT_ATTESTATION,
    }

    compressedSubmitAttestationBody = [
      Message.BodyType.SUBMIT_ATTESTATION,
      compressedSubmitAttestationContent,
    ]

    rejectAttestationForClaimBody = {
      content: requestAttestationContent.requestForAttestation.rootHash,
      type: Message.BodyType.REJECT_ATTESTATION,
    }
    requestClaimsForCTypesBody = {
      content: requestClaimsForCTypesContent,
      type: Message.BodyType.REQUEST_CREDENTIAL,
    }

    compressedRequestClaimsForCTypesBody = [
      Message.BodyType.REQUEST_CREDENTIAL,
      compressedRequestClaimsForCTypesContent,
    ]

    submitClaimsForCTypesBody = {
      content: submitClaimsForCTypesContent,
      type: Message.BodyType.SUBMIT_CREDENTIAL,
    }

    compressedSubmitClaimsForCTypesBody = [
      Message.BodyType.SUBMIT_CREDENTIAL,
      compressedSubmitClaimsForCTypesContent,
    ]

    acceptClaimsForCTypesBody = {
      content: [claim.cTypeHash],
      type: Message.BodyType.ACCEPT_CREDENTIAL,
    }

    rejectClaimsForCTypesBody = {
      content: [claim.cTypeHash],
      type: Message.BodyType.REJECT_CREDENTIAL,
    }

    requestAcceptDelegationBody = {
      content: requestAcceptDelegationContent,
      type: Message.BodyType.REQUEST_ACCEPT_DELEGATION,
    }

    compressedRequestAcceptDelegationBody = [
      Message.BodyType.REQUEST_ACCEPT_DELEGATION,
      compressedRequestAcceptDelegationContent,
    ]

    submitAcceptDelegationBody = {
      content: submitAcceptDelegationContent,
      type: Message.BodyType.SUBMIT_ACCEPT_DELEGATION,
    }

    compressedSubmitAcceptDelegationBody = [
      Message.BodyType.SUBMIT_ACCEPT_DELEGATION,
      compressedSubmitAcceptDelegationContent,
    ]

    rejectAcceptDelegationBody = {
      content: rejectAcceptDelegationContent,
      type: Message.BodyType.REJECT_ACCEPT_DELEGATION,
    }

    compressedRejectAcceptDelegationBody = [
      Message.BodyType.REJECT_ACCEPT_DELEGATION,
      compressedRejectAcceptDelegationContent,
    ]

    informCreateDelegationBody = {
      content: informCreateDelegationContent,
      type: Message.BodyType.INFORM_CREATE_DELEGATION,
    }

    compressedInformCreateDelegationBody = [
      Message.BodyType.INFORM_CREATE_DELEGATION,
      compressedInformCreateDelegationContent,
    ]
  })

  it('Checking message compression and decompression Terms', async () => {
    // Request compression of terms body
    expect(MessageUtils.compressMessage(requestTermsBody)).toEqual(
      compressedRequestTermsBody
    )
    // Request decompression of terms body
    expect(MessageUtils.decompressMessage(compressedRequestTermsBody)).toEqual(
      requestTermsBody
    )
    // Submit compression of terms body
    expect(MessageUtils.compressMessage(submitTermsBody)).toEqual(
      compressedSubmitTermsBody
    )
    // Submit decompression of terms body
    expect(MessageUtils.decompressMessage(compressedSubmitTermsBody)).toEqual(
      submitTermsBody
    )
    // Reject compression of terms body
    expect(MessageUtils.compressMessage(rejectTermsBody)).toEqual(
      compressedRejectTermsBody
    )
    // Reject decompression of terms body
    expect(MessageUtils.decompressMessage(compressedRejectTermsBody)).toEqual(
      rejectTermsBody
    )
  })
  it('Checking message compression and decompression Attestation', async () => {
    // Request compression of attestation body
    expect(MessageUtils.compressMessage(requestAttestationBody)).toEqual(
      compressedRequestAttestationBody
    )
    // Request decompression of attestation body
    expect(
      MessageUtils.decompressMessage(compressedRequestAttestationBody)
    ).toEqual(requestAttestationBody)
    // Submit compression of attestation body

    expect(MessageUtils.compressMessage(submitAttestationBody)).toEqual(
      compressedSubmitAttestationBody
    )
    // Submit decompression of attestation body
    expect(
      MessageUtils.decompressMessage(compressedSubmitAttestationBody)
    ).toEqual(submitAttestationBody)
  })

  it('Checking message compression and decompression Claims for CTypes', async () => {
    // Request compression of claims for ctypes body
    expect(MessageUtils.compressMessage(requestClaimsForCTypesBody)).toEqual(
      compressedRequestClaimsForCTypesBody
    )
    // Request decompression of claims for ctypes body
    expect(
      MessageUtils.decompressMessage(compressedRequestClaimsForCTypesBody)
    ).toEqual(requestClaimsForCTypesBody)
    // Submit compression of claims for ctypes body
    expect(MessageUtils.compressMessage(submitClaimsForCTypesBody)).toEqual(
      compressedSubmitClaimsForCTypesBody
    )
    // Submit decompression of claims for ctypes body
    expect(
      MessageUtils.decompressMessage(compressedSubmitClaimsForCTypesBody)
    ).toEqual(submitClaimsForCTypesBody)
  })
  it('Checking message compression and decompression delegation', async () => {
    // Request compression of delegation body
    expect(MessageUtils.compressMessage(requestAcceptDelegationBody)).toEqual(
      compressedRequestAcceptDelegationBody
    )
    // Request decompression of delegation body
    expect(
      MessageUtils.decompressMessage(compressedRequestAcceptDelegationBody)
    ).toEqual(requestAcceptDelegationBody)
    // Submit compression of delegation body
    expect(MessageUtils.compressMessage(submitAcceptDelegationBody)).toEqual(
      compressedSubmitAcceptDelegationBody
    )
    // Submit decompression of delegation body
    expect(
      MessageUtils.decompressMessage(compressedSubmitAcceptDelegationBody)
    ).toEqual(submitAcceptDelegationBody)
    // Reject compression of delegation body
    expect(MessageUtils.compressMessage(rejectAcceptDelegationBody)).toEqual(
      compressedRejectAcceptDelegationBody
    )
    // Reject decompression of delegation body
    expect(
      MessageUtils.decompressMessage(compressedRejectAcceptDelegationBody)
    ).toEqual(rejectAcceptDelegationBody)
  })
  it('Checking message compression and decompression Inform create delegation', async () => {
    // Inform compression of the create delegation
    expect(MessageUtils.compressMessage(informCreateDelegationBody)).toEqual(
      compressedInformCreateDelegationBody
    )
    // Inform decompression of the create delegation
    expect(
      MessageUtils.decompressMessage(compressedInformCreateDelegationBody)
    ).toEqual(informCreateDelegationBody)
  })
  it('Checks the MessageBody Types through the compress and decompress switch funciton', async () => {
    const compressedMalformed = (['', []] as unknown) as CompressedMessageBody

    expect(() =>
      MessageUtils.decompressMessage(compressedMalformed)
    ).toThrowError(SDKErrors.ERROR_MESSAGE_BODY_MALFORMED())

    const malformed = ({
      content: '',
      type: 'Message.BodyType',
    } as unknown) as MessageBody

    expect(() => MessageUtils.compressMessage(malformed)).toThrowError(
      SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
    )
  })
  it('Checking required properties for given CType', () => {
    expect(() =>
      MessageUtils.verifyRequiredCTypeProperties(['id', 'name'], testCType)
    ).toThrowError(SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING())

    expect(() =>
      MessageUtils.verifyRequiredCTypeProperties(
        ['id', 'name'],
        testCTypeWithMultipleProperties
      )
    ).not.toThrowError(SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING())

    expect(
      MessageUtils.verifyRequiredCTypeProperties(
        ['id', 'name'],
        testCTypeWithMultipleProperties
      )
    ).toEqual(true)
  })

  beforeAll(async () => {
    messageRequestTerms = new Message(
      requestTermsBody,
      identityAlice.did,
      identityBob.did
    )
    messageSubmitTerms = new Message(
      submitTermsBody,
      identityAlice.did,
      identityBob.did
    )
    messageRejectTerms = new Message(
      rejectTermsBody,
      identityAlice.did,
      identityBob.did
    )
    messageRequestAttestationForClaim = new Message(
      requestAttestationBody,
      identityAlice.did,
      identityBob.did
    )
    messageSubmitAttestationForClaim = new Message(
      submitAttestationBody,
      identityAlice.did,
      identityBob.did
    )

    messageRejectAttestationForClaim = new Message(
      rejectAttestationForClaimBody,
      identityAlice.did,
      identityBob.did
    )
    messageRequestClaimsForCTypes = new Message(
      requestClaimsForCTypesBody,
      identityAlice.did,
      identityBob.did
    )
    messageSubmitClaimsForCTypes = new Message(
      submitClaimsForCTypesBody,
      identityAlice.did,
      identityBob.did
    )
    messageAcceptClaimsForCTypes = new Message(
      acceptClaimsForCTypesBody,
      identityAlice.did,
      identityBob.did
    )
    messageRejectClaimsForCTypes = new Message(
      rejectClaimsForCTypesBody,
      identityAlice.did,
      identityBob.did
    )
    messageRequestAcceptDelegation = new Message(
      requestAcceptDelegationBody,
      identityAlice.did,
      identityBob.did
    )
    messageSubmitAcceptDelegation = new Message(
      submitAcceptDelegationBody,
      identityAlice.did,
      identityBob.did
    )
    messageRejectAcceptDelegation = new Message(
      rejectAcceptDelegationBody,
      identityAlice.did,
      identityBob.did
    )
    messageInformCreateDelegation = new Message(
      informCreateDelegationBody,
      identityAlice.did,
      identityBob.did
    )
  })
  it('error check should not throw errors on faulty bodies', () => {
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestTermsBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitTermsBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectTermsBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAttestationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAttestationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAttestationForClaimBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(acceptClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(informCreateDelegationBody)
    ).not.toThrowError()
  })
  it('error check should not throw errors on message', () => {
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestTerms)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitTerms)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectTerms)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageAcceptClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageInformCreateDelegation)
    ).not.toThrowError()
  })
  it('error check should throw errors on message', () => {
    messageRequestTerms.receiver = 'did:kilt:thisisnotareceiveraddress'
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestTerms)
    ).toThrowErrorWithCode(SDKErrors.ERROR_INVALID_DID_FORMAT(''))
    messageSubmitTerms.sender = 'this is not a sender did'
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitTerms)
    ).toThrowErrorWithCode(SDKErrors.ERROR_INVALID_DID_FORMAT(''))
    messageRejectTerms.sender = 'this is not a sender address'
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectTerms)
    ).toThrowErrorWithCode(SDKErrors.ERROR_INVALID_DID_FORMAT(''))
  })
  it('error check should throw errors on faulty bodies', () => {
    requestTermsBody.content.cTypeHash = 'this is not a ctype hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestTermsBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    submitTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitTermsBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())

    rejectTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectTermsBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    // @ts-expect-error
    delete rejectTermsBody.content.claim.cTypeHash
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectTermsBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED())
    requestAttestationBody.content.requestForAttestation.claimerSignature = {
      signature: 'this is not the claimers signature',
      keyId: 'this is not a key id',
    }
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAttestationBody)
    ).toThrowError()
    submitAttestationBody.content.attestation.claimHash =
      'this is not the claim hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAttestationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    rejectAttestationForClaimBody.content = 'this is not the root hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAttestationForClaimBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    requestClaimsForCTypesBody.content.cTypes[0].cTypeHash =
      'this is not a cTypeHash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestClaimsForCTypesBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    // @ts-expect-error
    delete submitClaimsForCTypesBody.content[0].attestation.revoked
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitClaimsForCTypesBody)
    ).toThrowError(SDKErrors.ERROR_REVOCATION_BIT_MISSING())
    acceptClaimsForCTypesBody.content[0] = 'this is not a cTypeHash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(acceptClaimsForCTypesBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        acceptClaimsForCTypesBody.content[0],
        'accept claims for ctypes message ctype hash invalid'
      )
    )
    rejectClaimsForCTypesBody.content[0] = 'this is not a cTypeHash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectClaimsForCTypesBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    delete requestAcceptDelegationBody.content.metaData
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAcceptDelegationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_OBJECT_MALFORMED())
    requestAcceptDelegationBody.content.signatures.inviter.signature =
      'this is not a signature'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAcceptDelegationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_SIGNATURE_DATA_TYPE())
    submitAcceptDelegationBody.content.signatures.invitee.keyId =
      'this is not a key id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAcceptDelegationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_SIGNATURE_DATA_TYPE())
    submitAcceptDelegationBody.content.delegationData.parentId =
      'this is not a parent id hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAcceptDelegationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_DELEGATION_ID_TYPE())
    // @ts-expect-error
    delete rejectAcceptDelegationBody.content.account
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAcceptDelegationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_OWNER_NOT_PROVIDED())
    informCreateDelegationBody.content.delegationId =
      'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(informCreateDelegationBody)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())
    expect(() =>
      MessageUtils.errorCheckMessageBody({} as MessageBody)
    ).toThrowError(SDKErrors.ERROR_MESSAGE_BODY_MALFORMED())
  })
  it('error check of the delegation data in messaging', () => {
    // @ts-expect-error
    delete requestAcceptDelegationBody.content.delegationData.isPCR
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(TypeError('isPCR is expected to be a boolean'))
    requestAcceptDelegationBody.content.delegationData.id =
      'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowErrorWithCode(SDKErrors.ERROR_DELEGATION_ID_TYPE())
    submitAcceptDelegationBody.content.delegationData.permissions = []
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowErrorWithCode(
      SDKErrors.ERROR_UNAUTHORIZED(
        'Must have at least one permission and no more then two'
      )
    )
    // @ts-expect-error
    delete submitAcceptDelegationBody.content.delegationData.id
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowErrorWithCode(SDKErrors.ERROR_DELEGATION_ID_MISSING())
  })
})

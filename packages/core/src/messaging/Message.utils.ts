import {
  IAttestedClaim,
  ITerms,
  CompressedAttestedClaim,
  CompressedTerms,
  CompressedAttestation,
  ICType,
  CompressedDelegationData,
  CompressedInformDelegationCreation,
  CompressedMessageBody,
  CompressedRejectedTerms,
  CompressedRequestAttestationForClaimContent,
  CompressedRequestDelegationApproval,
  CompressedSubmitDelegationApproval,
  IDelegationData,
  IInformDelegationCreation,
  IPartialClaim,
  IRequestAttestationForClaimContent,
  IRequestClaimsForCTypesContent,
  IRequestDelegationApproval,
  ISubmitAttestationForClaimContent,
  ISubmitDelegationApproval,
  MessageBody,
  MessageBodyType,
} from '@kiltprotocol/types'
import {
  QuoteUtils,
  ClaimUtils,
  AttestedClaimUtils,
  AttestationUtils,
  RequestForAttestationUtils,
} from '..'
import * as SDKErrors from '../errorhandling/SDKErrors'
import {} from './Message'

/**
 * [STATIC] Compresses a [[Message]] depending on the message body type.
 *
 * @param body The body of the [[Message]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 * @returns Returns the compressed message optimised for sending.
 */

export function compressMessage(body: MessageBody): CompressedMessageBody {
  switch (body.type) {
    case MessageBodyType.REQUEST_TERMS: {
      const compressedContents = ClaimUtils.compress(body.content)
      return [body.type, compressedContents]
    }
    case MessageBodyType.SUBMIT_TERMS: {
      const compressedContents: CompressedTerms = [
        ClaimUtils.compress(body.content.claim),
        body.content.legitimations.map(
          (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
            Array.isArray(attestedClaim)
              ? attestedClaim
              : AttestedClaimUtils.compress(attestedClaim)
        ),
        body.content.delegationId,
        body.content.quote
          ? QuoteUtils.compressAttesterSignedQuote(body.content.quote)
          : undefined,
        body.content.prerequisiteClaims,
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.REJECT_TERMS: {
      const compressedContents: CompressedRejectedTerms = [
        ClaimUtils.compress(body.content.claim),
        body.content.legitimations.map((val) =>
          AttestedClaimUtils.compress(val)
        ),
        body.content.delegationId || undefined,
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      const compressedContents: CompressedRequestAttestationForClaimContent = [
        RequestForAttestationUtils.compress(body.content.requestForAttestation),
        body.content.quote
          ? QuoteUtils.compressQuoteAgreement(body.content.quote)
          : undefined,
        body.content.prerequisiteClaims
          ? body.content.prerequisiteClaims.map((claim) =>
              ClaimUtils.compress(claim)
            )
          : undefined,
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      const compressedContents: CompressedAttestation = [
        AttestationUtils.compress(body.content.attestation),
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      const compressedContents: Array<ICType['hash']> = [body.content.ctypes]
      return [body.type, compressedContents]
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      const compressedContents: CompressedAttestedClaim[] = body.content.map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.compress(attestedClaim)
      )
      return [body.type, compressedContents]
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      const compressedContents: CompressedRequestDelegationApproval = [
        [
          body.content.delegationData.account,
          body.content.delegationData.id,
          body.content.delegationData.parentId,
          body.content.delegationData.permissions,
          body.content.delegationData.isPCR,
        ],
        body.content.signatures.inviter,
        body.content.metaData,
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      const compressedContents: CompressedSubmitDelegationApproval = [
        [
          body.content.delegationData.account,
          body.content.delegationData.id,
          body.content.delegationData.parentId,
          body.content.delegationData.permissions,
          body.content.delegationData.isPCR,
        ],
        [body.content.signatures.inviter, body.content.signatures.invitee],
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      const compressedContents: CompressedDelegationData = [
        body.content.account,
        body.content.id,
        body.content.parentId,
        body.content.permissions,
        body.content.isPCR,
      ]
      return [body.type, compressedContents]
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      const compressedContents: CompressedInformDelegationCreation = [
        body.content.delegationId,
        body.content.isPCR,
      ]
      return [body.type, compressedContents]
    }
    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }
}

/**
 * [STATIC] Takes a compressed [[Message]] and decompresses it depending on the message body type.
 *
 * @param body The body of the compressed [[Message]] which depends on the [[MessageBodyType]] that needs to be decompressed.
 *
 * @returns Returns the compressed message back to its original form and more human readable.
 */

export function decompressMessage(body: CompressedMessageBody): MessageBody {
  // body[0] is the [[MessageBodyType]] being sent.
  // body[1] is the content order of the [[compressMessage]] for each [[MessageBodyType]].
  // Each index matches the object keys from the given [[MessageBodyType]].
  switch (body[0]) {
    case MessageBodyType.REQUEST_TERMS: {
      const decompressedContents: IPartialClaim = ClaimUtils.decompress(body[1])
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.SUBMIT_TERMS: {
      const decompressedContents: ITerms = {
        claim: ClaimUtils.decompress(body[1][0]),
        legitimations: body[1][1].map(
          (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
            !Array.isArray(attestedClaim)
              ? attestedClaim
              : AttestedClaimUtils.decompress(attestedClaim)
        ),
        delegationId: body[1][2],
        quote: body[1][3]
          ? QuoteUtils.decompressAttesterSignedQuote(body[1][3])
          : undefined,
        prerequisiteClaims: body[1][4],
      }

      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.REJECT_TERMS: {
      const decompressedContents: Pick<
        ITerms,
        'claim' | 'legitimations' | 'delegationId'
      > = {
        claim: ClaimUtils.decompress(body[1][0]),
        legitimations: body[1][1].map((val) =>
          AttestedClaimUtils.decompress(val)
        ),
        delegationId: body[1][2] ? body[1][2] : undefined,
      }
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      const decompressedContents: IRequestAttestationForClaimContent = {
        requestForAttestation: RequestForAttestationUtils.decompress(
          body[1][0]
        ),
        quote: body[1][1]
          ? QuoteUtils.decompressQuoteAgreement(body[1][1])
          : undefined,
        prerequisiteClaims: body[1][2]
          ? body[1][2].map((claim) => ClaimUtils.decompress(claim))
          : undefined,
      }

      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      const decompressedContents: ISubmitAttestationForClaimContent = {
        attestation: AttestationUtils.decompress(body[1][0]),
      }
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      const decompressedContents: IRequestClaimsForCTypesContent = {
        ctypes: body[1][0],
        peRequest: body[1][1],
        allowPE: body[1][2],
      }
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      const decompressedContents = body[1].map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          !Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.decompress(attestedClaim)
      )

      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      const decompressedContents: IRequestDelegationApproval = {
        delegationData: {
          account: body[1][0][0],
          id: body[1][0][1],
          parentId: body[1][0][2],
          permissions: body[1][0][3],
          isPCR: body[1][0][4],
        },
        signatures: { inviter: body[1][1] },
        metaData: body[1][2],
      }
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      const decompressedContents: ISubmitDelegationApproval = {
        delegationData: {
          account: body[1][0][0],
          id: body[1][0][1],
          parentId: body[1][0][2],
          permissions: body[1][0][3],
          isPCR: body[1][0][4],
        },
        signatures: {
          inviter: body[1][1][0],
          invitee: body[1][1][1],
        },
      }
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      const decompressedContents: IDelegationData = {
        account: body[1][0],
        id: body[1][1],
        parentId: body[1][2],
        permissions: body[1][3],
        isPCR: body[1][4],
      }
      return { type: body[0], content: decompressedContents }
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      const decompressedContents: IInformDelegationCreation = {
        delegationId: body[1][0],
        isPCR: body[1][1],
      }
      return { type: body[0], content: decompressedContents }
    }
    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }
}

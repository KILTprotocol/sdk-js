import { CompressedAttestedClaim } from '../types/AttestedClaim'
import {
  QuoteUtils,
  ClaimUtils,
  AttestedClaimUtils,
  MessageBody,
  AttestationUtils,
  MessageBodyType,
  IAttestedClaim,
  RequestForAttestationUtils,
} from '..'
import ITerms, { CompressedTerms } from '../types/Terms'
import {
  CompressedRejectedTerms,
  CompressedRequestAttestationForClaim,
  CompressedSubmitAttestationForClaim,
  CompressedRequestClaimsForCTypes,
  CompressedRequestAcceptDelegation,
  CompressedSubmitAcceptDelegation,
  CompressedDelegationData,
  CompressedInformCreateDelegation,
  IRequestingClaimsForCTypes,
  IPartialClaim,
  IRequestingAttestationForClaim,
  ISubmittingAttestationForClaim,
  IRequestingAcceptDelegation,
  ISubmitingAcceptDelegation,
  IDelegationData,
  IInformingCreateDelegation,
} from './Message'

/**
 * [STATIC] Compresses a [[Message]] depending on the message body type.
 *
 * @param body The body of the [[Message]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 *
 */

export const compressMessage = (body: MessageBody): MessageBody => {
  switch (body.type) {
    case MessageBodyType.REQUEST_TERMS: {
      if (Array.isArray(body.content)) return body

      const compressedContents = ClaimUtils.compress(body.content)
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.SUBMIT_TERMS: {
      if (Array.isArray(body.content)) return body

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
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.REJECT_TERMS: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedRejectedTerms = [
        ClaimUtils.compress(body.content.claim),
        body.content.legitimations.map((val) =>
          AttestedClaimUtils.compress(val)
        ),
        body.content.delegationId ? body.content.delegationId : undefined,
      ]
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedRequestAttestationForClaim = [
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
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedSubmitAttestationForClaim = [
        AttestationUtils.compress(body.content.attestation),
        body.content.attestationPE ? body.content.attestationPE : undefined,
      ]
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedRequestClaimsForCTypes = [
        body.content.ctypes,
        body.content.peRequest,
        body.content.allowPE,
      ]
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC: {
      const compressedContents: CompressedAttestedClaim[] = body.content.map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.compress(attestedClaim)
      )
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedRequestAcceptDelegation = [
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
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedSubmitAcceptDelegation = [
        [
          body.content.delegationData.account,
          body.content.delegationData.id,
          body.content.delegationData.parentId,
          body.content.delegationData.permissions,
          body.content.delegationData.isPCR,
        ],
        [body.content.signatures.inviter, body.content.signatures.invitee],
      ]
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedDelegationData = [
        body.content.account,
        body.content.id,
        body.content.parentId,
        body.content.permissions,
        body.content.isPCR,
      ]
      return {
        ...body,
        content: compressedContents,
      }
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedInformCreateDelegation = [
        body.content.delegationId,
        body.content.isPCR,
      ]
      return {
        ...body,
        content: compressedContents,
      }
    }
    default:
      return body
  }
}

/**
 * [STATIC] Takes a compressed [[Message]] and decompresses it depending on the message body type.
 *
 * @param body The body of the compressed [[Message]] which depends on the [[MessageBodyType]] that needs to be decompressed.
 *
 *
 */

export const decompressMessage = (body: MessageBody): MessageBody => {
  switch (body.type) {
    case MessageBodyType.REQUEST_TERMS: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: IPartialClaim = ClaimUtils.decompress(
        body.content
      )
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.SUBMIT_TERMS: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: ITerms = {
        claim: ClaimUtils.decompress(body.content[0]),
        legitimations: body.content[1].map(
          (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
            !Array.isArray(attestedClaim)
              ? attestedClaim
              : AttestedClaimUtils.decompress(attestedClaim)
        ),
        delegationId: body.content[2],
        quote: body.content[3]
          ? QuoteUtils.decompressAttesterSignedQuote(body.content[3])
          : undefined,
        prerequisiteClaims: body.content[4],
      }

      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.REJECT_TERMS: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: Pick<
        ITerms,
        'claim' | 'legitimations' | 'delegationId'
      > = {
        claim: ClaimUtils.decompress(body.content[0]),
        legitimations: body.content[1].map((val) =>
          AttestedClaimUtils.decompress(val)
        ),
        delegationId: body.content[2] ? body.content[2] : undefined,
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: IRequestingAttestationForClaim = {
        requestForAttestation: RequestForAttestationUtils.decompress(
          body.content[0]
        ),
        quote: body.content[1]
          ? QuoteUtils.decompressQuoteAgreement(body.content[1])
          : undefined,
        prerequisiteClaims: body.content[2]
          ? body.content[2].map((claim) => ClaimUtils.decompress(claim))
          : undefined,
      }

      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: ISubmittingAttestationForClaim = {
        attestation: AttestationUtils.decompress(body.content[0]),
        attestationPE: body.content[1] ? body.content[1] : undefined,
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: IRequestingClaimsForCTypes = {
        ctypes: body.content[0],
        peRequest: body.content[1],
        allowPE: body.content[2],
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC: {
      const decompressedContents: Array<
        IAttestedClaim | CompressedAttestedClaim
      > = body.content.map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          !Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.decompress(attestedClaim)
      )

      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: IRequestingAcceptDelegation = {
        delegationData: {
          account: body.content[0][0],
          id: body.content[0][1],
          parentId: body.content[0][2],
          permissions: body.content[0][3],
          isPCR: body.content[0][4],
        },
        signatures: { inviter: body.content[1] },
        metaData: body.content[2],
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: ISubmitingAcceptDelegation = {
        delegationData: {
          account: body.content[0][0],
          id: body.content[0][1],
          parentId: body.content[0][2],
          permissions: body.content[0][3],
          isPCR: body.content[0][4],
        },
        signatures: {
          inviter: body.content[1][0],
          invitee: body.content[1][1],
        },
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: IDelegationData = {
        account: body.content[0],
        id: body.content[1],
        parentId: body.content[2],
        permissions: body.content[3],
        isPCR: body.content[4],
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      if (!Array.isArray(body.content)) return body
      const decompressedContents: IInformingCreateDelegation = {
        delegationId: body.content[0],
        isPCR: body.content[1],
      }
      return {
        ...body,
        content: decompressedContents,
      }
    }
    default:
      return body
  }
}

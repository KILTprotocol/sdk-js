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
import { CompressedTerms } from '../types/Terms'
import {
  CompressedRejectedTerms,
  CompressedRequestAttestationForClaim,
  CompressedInitiateAttestation,
  CompressedSubmitAttestationForClaim,
  CompressedRequestClaimsForCTypes,
  CompressedRequestAcceptDelegation,
  CompressedSubmitAcceptDelegation,
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
    case MessageBodyType.INITIATE_ATTESTATION: {
      if (Array.isArray(body.content)) return body

      const compressedContents: CompressedInitiateAttestation = [body.content]
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
      const compressedContents = body.content.map(
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
    // case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE: {
    //   const compressedContents: CompressedCombinedPresentation = [
    //     body.content.toString(),
    //   ]
    //   return {
    //     ...body,
    //     content: compressedContents,
    //   }
    // }
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
    // case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
    //   const compressedContents = []
    //   return {
    //     ...body,
    //     content: compressedContents,
    //   }
    // }
    // case MessageBodyType.INFORM_CREATE_DELEGATION: {
    //   const compressedContents = []
    //   return {
    //     ...body,
    //     content: compressedContents,
    //   }
    // }

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
    // case MessageBodyType.REQUEST_TERMS: {
    //   console.log('hello', body.content.contents)
    //   return body
    // }

    case MessageBodyType.SUBMIT_TERMS: {
      return body
    }
    case MessageBodyType.REJECT_TERMS: {
      return body
    }
    case MessageBodyType.INITIATE_ATTESTATION: {
      return body
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      return body
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      return body
    }
    case MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM: {
      return body
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      return body
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC: {
      return body
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE: {
      return body
    }
    case MessageBodyType.ACCEPT_CLAIMS_FOR_CTYPES: {
      return body
    }
    case MessageBodyType.REJECT_CLAIMS_FOR_CTYPES: {
      return body
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      return body
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      return body
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      return body
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      return body
    }

    default:
      return body
  }
}

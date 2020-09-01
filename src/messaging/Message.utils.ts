import {
  QuoteUtils,
  ClaimUtils,
  AttestedClaimUtils,
  MessageBody,
  AttestationUtils,
  RequestForAttestationUtils,
  MessageBodyType,
} from '..'

/**
 * [STATIC] Compresses a [[Message]] depending on the message body type.
 *
 * @param body The body of the [[Message]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 *
 */

export const compressMessage = (body: MessageBody) => {
  switch (body.type) {
    case MessageBodyType.REQUEST_TERMS: {
      const compressedBody = {}
      return compressedBody
    }

    case MessageBodyType.SUBMIT_TERMS: {
      const compressedBody = {
        claims: ClaimUtils.compress(body.content.claim),
        legitimations: body.content.legitimations.map((val) =>
          AttestedClaimUtils.compress(val)
        ),
        delegationId: body.content.delegationId,
        quote: body.content.quote
          ? QuoteUtils.compressAttesterSignedQuote(body.content.quote)
          : undefined,
      }
      return compressedBody
    }
    case MessageBodyType.REJECT_TERMS: {
      const compressedBody = {
        claims: ClaimUtils.compress(body.content.claim),
        legitimations: body.content.legitimations.map((val) =>
          AttestedClaimUtils.compress(val)
        ),
        delegationId: body.content.delegationId,
      }
      return compressedBody
    }
    case MessageBodyType.INITIATE_ATTESTATION: {
      return body.content
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      const compressedBody = {
        requestForAttestation: RequestForAttestationUtils.compress(
          body.content.requestForAttestation
        ),
        quote: body.content.quote
          ? QuoteUtils.compressAttesterSignedQuote(body.content.quote)
          : undefined,
        prerequisiteClaims: body.content.prerequisiteClaims,
      }
      return compressedBody
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      const compressedBody = {
        attestation: AttestationUtils.compress(body.content.attestation),
        attestationPE: body.content.attestationPE,
      }
      return compressedBody
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      const compressedBody = {
        ctypes: body.content.ctypes,
        peRequest: body.content.peRequest,
        allowPE: body.content.allowPE,
      }
      return compressedBody
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC: {
      const compressedBody = {
        content: body.content.map((val) => AttestedClaimUtils.compress(val)),
      }
      return compressedBody
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE: {
      const compressedBody = {}
      return compressedBody
    }
    case MessageBodyType.ACCEPT_CLAIMS_FOR_CTYPES: {
      const compressedBody = {}
      return compressedBody
    }
    case MessageBodyType.REJECT_CLAIMS_FOR_CTYPES: {
      const compressedBody = {}
      return compressedBody
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      const compressedBody = {}
      return compressedBody
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      const compressedBody = {}
      return compressedBody
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      const compressedBody = {}
      return compressedBody
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      const compressedBody = {}
      return compressedBody
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
      console.log('hello', body.content.contents)
      return body
    }

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

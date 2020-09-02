import { CompressedAttestedClaim } from '../types/AttestedClaim'
import {
  QuoteUtils,
  ClaimUtils,
  AttestedClaimUtils,
  MessageBody,
  //   AttestationUtils,
  //   RequestForAttestationUtils,
  MessageBodyType,
  IAttestedClaim,
  //   IAttestedClaim,
} from '..'
import { ICompressedTerms } from '../types/Terms'

/**
 * [STATIC] Compresses a [[Message]] depending on the message body type.
 *
 * @param body The body of the [[Message]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 *
 */

export const compressMessage = (body: MessageBody): MessageBody => {
  switch (body.type) {
    // case MessageBodyType.REQUEST_TERMS: {
    //   const compressedBody = {}
    //   return compressedBody
    // }

    case MessageBodyType.SUBMIT_TERMS: {
      if (!Array.isArray(body.content)) {
        const compressedContents: ICompressedTerms = [
          ClaimUtils.compress(body.content.claim),
          body.content.legitimations.map(
            (val: IAttestedClaim | CompressedAttestedClaim) =>
              Array.isArray(val) ? val : AttestedClaimUtils.compress(val)
          ),
          body.content.delegationId,
          body.content.quote
            ? QuoteUtils.compressAttesterSignedQuote(body.content.quote)
            : undefined,
          body.content.prerequisiteClaims,
        ]
        // eslint-disable-next-line no-param-reassign
        body.content = compressedContents
        return body
      }
      return body
      break
    }
    // case MessageBodyType.REJECT_TERMS: {
    //   const compressedContents = {
    //     claims: ClaimUtils.compress(body.content.claim),
    //     legitimations: body.content.legitimations.map((val) =>
    //       AttestedClaimUtils.compress(val)
    //     ),
    //     delegationId: body.content.delegationId,
    //   }
    //   return compressedContents
    // }
    // case MessageBodyType.INITIATE_ATTESTATION: {
    //   return body.content
    // }
    // case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
    //   const compressedContents = {
    //     requestForAttestation: RequestForAttestationUtils.compress(
    //       body.content.requestForAttestation
    //     ),
    //     quote: body.content.quote
    //       ? QuoteUtils.compressAttesterSignedQuote(body.content.quote)
    //       : undefined,
    //     prerequisiteClaims: body.content.prerequisiteClaims,
    //   }
    //   return compressedContents
    // }
    // case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
    //   const compressedContents = {
    //     attestation: AttestationUtils.compress(body.content.attestation),
    //     attestationPE: body.content.attestationPE,
    //   }
    //   return compressedContents
    // }
    // case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
    //   const compressedContents = {
    //     ctypes: body.content.ctypes,
    //     peRequest: body.content.peRequest,
    //     allowPE: body.content.allowPE,
    //   }
    //   return compressedContents
    // }
    // case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC: {
    //   const compressedContents = {
    //     content: body.content.map((val) => AttestedClaimUtils.compress(val)),
    //   }
    //   return compressedContents
    // }
    // case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE: {
    //   const compressedContents = {}
    //   return compressedContents
    // }
    // case MessageBodyType.ACCEPT_CLAIMS_FOR_CTYPES: {
    //   const compressedContents = {}
    //   return compressedContents
    // }
    // case MessageBodyType.REJECT_CLAIMS_FOR_CTYPES: {
    //   const compressedContents = {}
    //   return compressedContents
    // }
    // case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
    //   const compressedContents = {}
    //   return compressedContents
    // }
    // case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
    //   const compressedContents = {}
    //   return compressedContents
    // }
    // case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
    //   const compressedContents = {}
    //   return compressedContents
    // }
    // case MessageBodyType.INFORM_CREATE_DELEGATION: {
    //   const compressedContents = {}
    //   return compressedContents
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

import {
  IAttestedClaim,
  CompressedAttestedClaim,
  CompressedMessageBody,
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

/**
 * [STATIC] Compresses a [[Message]] depending on the message body type.
 *
 * @param body The body of the [[Message]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 * @returns Returns the compressed message optimised for sending.
 */

export function compressMessage(body: MessageBody): CompressedMessageBody {
  // body[0] is the [[MessageBodyType]] being sent.
  // body[1] is the content order of the [[compressMessage]] for each [[MessageBodyType]].
  // Each index matches the object keys from the given [[MessageBodyType]].
  let compressedContents: CompressedMessageBody[1]
  switch (body.type) {
    case MessageBodyType.REQUEST_TERMS: {
      compressedContents = ClaimUtils.compress(body.content)
      break
    }
    case MessageBodyType.SUBMIT_TERMS: {
      compressedContents = [
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
      break
    }
    case MessageBodyType.REJECT_TERMS: {
      compressedContents = [
        ClaimUtils.compress(body.content.claim),
        body.content.legitimations.map((val) =>
          AttestedClaimUtils.compress(val)
        ),
        body.content.delegationId || undefined,
      ]
      break
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      compressedContents = [
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
      break
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      compressedContents = AttestationUtils.compress(body.content.attestation)
      break
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      compressedContents = body.content.ctypes
      break
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      compressedContents = body.content.map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.compress(attestedClaim)
      )
      break
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      compressedContents = [
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
      break
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      compressedContents = [
        [
          body.content.delegationData.account,
          body.content.delegationData.id,
          body.content.delegationData.parentId,
          body.content.delegationData.permissions,
          body.content.delegationData.isPCR,
        ],
        [body.content.signatures.inviter, body.content.signatures.invitee],
      ]
      break
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      compressedContents = [
        body.content.account,
        body.content.id,
        body.content.parentId,
        body.content.permissions,
        body.content.isPCR,
      ]
      break
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      compressedContents = [body.content.delegationId, body.content.isPCR]
      break
    }
    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }
  return [body.type, compressedContents] as CompressedMessageBody
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
  let decompressedContents: MessageBody['content']
  switch (body[0]) {
    case MessageBodyType.REQUEST_TERMS: {
      decompressedContents = ClaimUtils.decompress(body[1])
      break
    }
    case MessageBodyType.SUBMIT_TERMS: {
      decompressedContents = {
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

      break
    }
    case MessageBodyType.REJECT_TERMS: {
      decompressedContents = {
        claim: ClaimUtils.decompress(body[1][0]),
        legitimations: body[1][1].map((val) =>
          AttestedClaimUtils.decompress(val)
        ),
        delegationId: body[1][2] ? body[1][2] : undefined,
      }
      break
    }
    case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      decompressedContents = {
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

      break
    }
    case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      decompressedContents = {
        attestation: AttestationUtils.decompress(body[1]),
      }
      break
    }
    case MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      decompressedContents = {
        ctypes: body[1],
      }
      break
    }
    case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      decompressedContents = body[1].map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          !Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.decompress(attestedClaim)
      )

      break
    }
    case MessageBodyType.REQUEST_ACCEPT_DELEGATION: {
      decompressedContents = {
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
      break
    }
    case MessageBodyType.SUBMIT_ACCEPT_DELEGATION: {
      decompressedContents = {
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
      break
    }
    case MessageBodyType.REJECT_ACCEPT_DELEGATION: {
      decompressedContents = {
        account: body[1][0],
        id: body[1][1],
        parentId: body[1][2],
        permissions: body[1][3],
        isPCR: body[1][4],
      }
      break
    }
    case MessageBodyType.INFORM_CREATE_DELEGATION: {
      decompressedContents = {
        delegationId: body[1][0],
        isPCR: body[1][1],
      }
      break
    }
    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }

  return { type: body[0], content: decompressedContents } as MessageBody
}

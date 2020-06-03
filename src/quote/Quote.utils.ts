/**
 * @packageDocumentation
 * @module QuoteUtils
 * @preferred
 */

import {
  CompressedQuoteAgreed,
  ICostBreakdown,
  CompressedCostBreakdown,
  IQuote,
  CompressedQuote,
  IQuoteAttesterSigned,
  CompressedQuoteAttesterSigned,
  IQuoteAgreement,
} from '../types/Quote'

/**
 *  Compresses the cost from a [[Quote]] object.
 *
 * @param cost A cost object that will be sorted and stripped into a [[Quote]].
 * @throws When cost is missing any property defined in [[ICostBreakdown]].
 *
 * @returns An ordered array of a cost.
 */

export function compressCost(cost: ICostBreakdown): CompressedCostBreakdown {
  if (!cost.gross || !cost.net || !cost.tax) {
    throw new Error(
      `Property Not Provided while building cost : ${JSON.stringify(
        cost,
        null,
        2
      )}`
    )
  }
  return [cost.gross, cost.net, cost.tax]
}

/**
 *  Decompresses the cost from storage and/or message.
 *
 * @param cost A compressed cost array that is reverted back into an object.
 * @throws When cost is not an Array and it's length does not equal the defined length of 3.
 *
 * @returns An object that has the same properties as a cost.
 */

export function decompressCost(cost: CompressedCostBreakdown): ICostBreakdown {
  if (!Array.isArray(cost) || cost.length !== 3) {
    throw new Error(
      `Compressed cost isn't an Array or has all the required data types`
    )
  }
  return { gross: cost[0], net: cost[1], tax: cost[2] }
}

/**
 *  Compresses a [[Quote]] for storage and/or messaging.
 *
 * @param quote An [[Quote]] object that will be sorted and stripped for messaging or storage.
 * @throws When quote is missing any property defined in [[IQuote]].
 *
 * @returns An ordered array of an [[Quote]].
 */

export function compressQuote(quote: IQuote): CompressedQuote {
  if (
    !quote.attesterAddress ||
    !quote.cTypeHash ||
    !quote.cost ||
    !quote.currency ||
    !quote.termsAndConditions ||
    !quote.timeframe
  ) {
    throw new Error(
      `Property Not Provided while building quote: ${JSON.stringify(
        quote,
        null,
        2
      )}`
    )
  }
  return [
    quote.attesterAddress,
    quote.cTypeHash,
    compressCost(quote.cost),
    quote.currency,
    quote.termsAndConditions,
    quote.timeframe,
  ]
}

/**
 *  Decompresses an [[Quote]] from storage and/or message.
 *
 * @param quote A compressed [[Quote]] array that is reverted back into an object.
 * @throws When quote is not an Array and it's length does not equal the defined length of 6.
 * @returns An object that has the same properties as an [[Quote]].
 */

export function decompressQuote(quote: CompressedQuote): IQuote {
  if (!Array.isArray(quote) || quote.length !== 6) {
    throw new Error(
      `Compressed quote isn't an Array or has all the required data types`
    )
  }
  return {
    attesterAddress: quote[0],
    cTypeHash: quote[1],
    cost: decompressCost(quote[2]),
    currency: quote[3],
    termsAndConditions: quote[4],
    timeframe: quote[5],
  }
}

/**
 *  Compresses an attester signed [[Quote]] for storage and/or messaging.
 *
 * @param attesterSignedQuote An attester signed [[Quote]] object that will be sorted and stripped for messaging or storage.
 * @throws When attesterSignedQuote is missing any property defined in [[IQuoteAttesterSigned]].
 *
 * @returns An ordered array of an attester signed [[Quote]].
 */

export function compressAttesterSignedQuote(
  attesterSignedQuote: IQuoteAttesterSigned
): CompressedQuoteAttesterSigned {
  if (
    !attesterSignedQuote.attesterAddress ||
    !attesterSignedQuote.cTypeHash ||
    !attesterSignedQuote.cost ||
    !attesterSignedQuote.currency ||
    !attesterSignedQuote.termsAndConditions ||
    !attesterSignedQuote.timeframe ||
    !attesterSignedQuote.attesterSignature
  ) {
    throw new Error(
      `Property Not Provided while building attesterSignedQuote: ${JSON.stringify(
        attesterSignedQuote,
        null,
        2
      )}`
    )
  }
  return [
    attesterSignedQuote.attesterAddress,
    attesterSignedQuote.cTypeHash,
    compressCost(attesterSignedQuote.cost),
    attesterSignedQuote.currency,
    attesterSignedQuote.termsAndConditions,
    attesterSignedQuote.timeframe,
    attesterSignedQuote.attesterSignature,
  ]
}

/**
 *  Decompresses an attester signed [[Quote]] from storage and/or message.
 *
 * @param attesterSignedQuote A compressed attester signed [[Quote]] array that is reverted back into an object.
 * @throws When attesterSignedQuote is not an Array and it's length does not equal the defined length of 7.
 *
 * @returns An object that has the same properties as an attester signed [[Quote]].
 */

export function decompressAttesterSignedQuote(
  attesterSignedQuote: CompressedQuoteAttesterSigned
): IQuoteAttesterSigned {
  if (!Array.isArray(attesterSignedQuote) || attesterSignedQuote.length !== 7) {
    throw new Error(
      `Compressed attesterSignedQuote isn't an Array or has all the required data types`
    )
  }
  return {
    attesterAddress: attesterSignedQuote[0],
    cTypeHash: attesterSignedQuote[1],
    cost: decompressCost(attesterSignedQuote[2]),
    currency: attesterSignedQuote[3],
    termsAndConditions: attesterSignedQuote[4],
    timeframe: attesterSignedQuote[5],
    attesterSignature: attesterSignedQuote[6],
  }
}

/**
 *  Compresses a [[Quote]] Agreement for storage and/or messaging.
 *
 * @param quoteAgreement A [[Quote]] Agreement object that will be sorted and stripped for messaging or storage.
 * @throws When quoteAgreement is missing any property defined in [[IQuoteAgreement]].
 *
 * @returns An ordered array of a [[Quote]] Agreement.
 */

export function compressQuoteAgreement(
  quoteAgreement: IQuoteAgreement
): CompressedQuoteAgreed {
  if (
    !quoteAgreement.attesterAddress ||
    !quoteAgreement.cTypeHash ||
    !quoteAgreement.cost ||
    !quoteAgreement.currency ||
    !quoteAgreement.termsAndConditions ||
    !quoteAgreement.timeframe ||
    !quoteAgreement.attesterSignature
  ) {
    throw new Error(
      `Property Not Provided while building quoteAgreement: ${JSON.stringify(
        quoteAgreement,
        null,
        2
      )}`
    )
  }
  return [
    quoteAgreement.attesterAddress,
    quoteAgreement.cTypeHash,
    compressCost(quoteAgreement.cost),
    quoteAgreement.currency,
    quoteAgreement.termsAndConditions,
    quoteAgreement.timeframe,
    quoteAgreement.attesterSignature,
    quoteAgreement.claimerSignature,
    quoteAgreement.rootHash,
  ]
}

/**
 *  Decompresses a [[Quote]] Agreement from storage and/or message.
 *
 * @param quoteAgreement A compressed [[Quote]] Agreement array that is reverted back into an object.
 * @throws When quoteAgreement is not an Array and it's length does not equal the defined length of 9.
 *
 * @returns An object that has the same properties as a [[Quote]] Agreement.
 */

export function decompressQuoteAgreement(
  quoteAgreement: CompressedQuoteAgreed
): IQuoteAgreement {
  if (!Array.isArray(quoteAgreement) || quoteAgreement.length !== 9) {
    throw new Error(
      `Compressed quoteAgreement isn't an Array or has all the required data types`
    )
  }
  return {
    attesterAddress: quoteAgreement[0],
    cTypeHash: quoteAgreement[1],
    cost: decompressCost(quoteAgreement[2]),
    currency: quoteAgreement[3],
    termsAndConditions: quoteAgreement[4],
    timeframe: quoteAgreement[5],
    attesterSignature: quoteAgreement[6],
    claimerSignature: quoteAgreement[7],
    rootHash: quoteAgreement[8],
  }
}

export default {
  compressCost,
  decompressCost,
  decompressQuote,
  decompressQuoteAgreement,
  decompressAttesterSignedQuote,
  compressQuote,
  compressQuoteAgreement,
  compressAttesterSignedQuote,
}

/**
 * @packageDocumentation
 * @module IQuote
 */

import type { ICType } from './CType'

export interface ICostBreakdown {
  tax: Record<string, unknown>
  net: number
  gross: number
}
export interface IQuote {
  attesterAddress: string
  cTypeHash: ICType['hash']
  cost: ICostBreakdown
  currency: string
  timeframe: Date
  termsAndConditions: string
}
export interface IQuoteAttesterSigned extends IQuote {
  attesterSignature: string
}

export interface IQuoteAgreement extends IQuoteAttesterSigned {
  rootHash: string
  claimerSignature: string
}

export type CompressedCostBreakdown = [
  ICostBreakdown['gross'],
  ICostBreakdown['net'],
  ICostBreakdown['tax']
]

export type CompressedQuote = [
  IQuote['attesterAddress'],
  IQuote['cTypeHash'],
  CompressedCostBreakdown,
  IQuote['currency'],
  IQuote['termsAndConditions'],
  IQuote['timeframe']
]

export type CompressedQuoteAttesterSigned = [
  CompressedQuote[0],
  CompressedQuote[1],
  CompressedQuote[2],
  CompressedQuote[3],
  CompressedQuote[4],
  CompressedQuote[5],
  IQuoteAttesterSigned['attesterSignature']
]

export type CompressedQuoteAgreed = [
  CompressedQuote[0],
  CompressedQuote[1],
  CompressedQuote[2],
  CompressedQuote[3],
  CompressedQuote[4],
  CompressedQuote[5],
  CompressedQuoteAttesterSigned[6],
  IQuoteAgreement['claimerSignature'],
  IQuoteAgreement['rootHash']
]

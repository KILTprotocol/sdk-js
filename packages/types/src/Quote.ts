/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IQuote
 */

import type { ICType } from './CType'
import type { DidSignature, IDidDetails } from './DidDetails'

export interface ICostBreakdown {
  tax: Record<string, unknown>
  net: number
  gross: number
}
export interface IQuote {
  attesterDid: IDidDetails['uri']
  cTypeHash: ICType['hash']
  cost: ICostBreakdown
  currency: string
  timeframe: string
  termsAndConditions: string
}
export interface IQuoteAttesterSigned extends IQuote {
  attesterSignature: DidSignature
}

export interface IQuoteAgreement extends IQuoteAttesterSigned {
  rootHash: string
  claimerSignature: DidSignature
}

export type CompressedCostBreakdown = [
  ICostBreakdown['gross'],
  ICostBreakdown['net'],
  ICostBreakdown['tax']
]

export type CompressedQuote = [
  IQuote['attesterDid'],
  IQuote['cTypeHash'],
  CompressedCostBreakdown,
  IQuote['currency'],
  IQuote['termsAndConditions'],
  IQuote['timeframe']
]

export type CompressedQuoteAttesterSigned = [
  ...CompressedQuote,
  [
    IQuoteAttesterSigned['attesterSignature']['signature'],
    IQuoteAttesterSigned['attesterSignature']['keyUri']
  ]
]

export type CompressedQuoteAgreed = [
  ...CompressedQuoteAttesterSigned,
  [
    IQuoteAgreement['claimerSignature']['signature'],
    IQuoteAgreement['claimerSignature']['keyUri']
  ],
  IQuoteAgreement['rootHash']
]

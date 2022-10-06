/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { DidSignature, DidUri } from './DidDocument'
import type { ICredential } from './Credential'

export interface ICostBreakdown {
  tax: Record<string, unknown>
  net: number
  gross: number
}
export interface IQuote {
  attesterDid: DidUri
  cTypeHash: HexString
  cost: ICostBreakdown
  currency: string
  timeframe: string
  termsAndConditions: string
}
export interface IQuoteAttesterSigned extends IQuote {
  attesterSignature: DidSignature
}

export interface IQuoteAgreement extends IQuoteAttesterSigned {
  rootHash: ICredential['rootHash']
  claimerSignature: DidSignature
}

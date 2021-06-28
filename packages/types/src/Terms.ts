/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module ITerms
 */

import type { IAttestedClaim, CompressedAttestedClaim } from './AttestedClaim'
import type { CompressedCType, ICType } from './CType'
import type { IDelegationBaseNode } from './Delegation'
import type {
  IQuoteAttesterSigned,
  CompressedQuoteAttesterSigned,
} from './Quote'
import type { CompressedPartialClaim } from './Message'
import type { PartialClaim } from './Claim'

export interface ITerms {
  claim: PartialClaim
  legitimations: IAttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
  cTypes?: ICType[]
}

export type CompressedTerms = [
  CompressedPartialClaim,
  CompressedAttestedClaim[],
  IDelegationBaseNode['id'] | undefined,
  CompressedQuoteAttesterSigned | undefined,
  ICType['hash'] | undefined,
  CompressedCType[] | undefined
]

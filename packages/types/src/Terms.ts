/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { CompressedCType, ICType } from './CType'
import type { IDelegationNode } from './Delegation'
import type {
  IQuoteAttesterSigned,
  CompressedQuoteAttesterSigned,
} from './Quote'
import type { CompressedPartialClaim } from './Message'
import type { PartialClaim } from './Claim'
import type {
  CompressedRequestForAttestation,
  IRequestForAttestation,
} from './RequestForAttestation'

export interface ITerms {
  claim: PartialClaim
  legitimations: IRequestForAttestation[]
  delegationId?: IDelegationNode['id']
  quote?: IQuoteAttesterSigned
  cTypes?: ICType[]
}

export type CompressedTerms = [
  CompressedPartialClaim,
  CompressedRequestForAttestation[],
  IDelegationNode['id'] | undefined,
  CompressedQuoteAttesterSigned | undefined,
  CompressedCType[] | undefined
]

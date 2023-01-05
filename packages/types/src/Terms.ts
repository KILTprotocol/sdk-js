/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType } from './CType'
import type { IDelegationNode } from './Delegation'
import type { IQuoteAttesterSigned } from './Quote'
import type { PartialClaim } from './Claim'
import type { ICredential } from './Credential'

export interface ITerms {
  claim: PartialClaim
  legitimations: ICredential[]
  delegationId?: IDelegationNode['id']
  quote?: IQuoteAttesterSigned
  cTypes?: ICType[]
}

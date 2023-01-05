/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri } from './DidDocument'
import type { IDelegationNode } from './Delegation'
import type { ICredential } from './Credential'
import type { CTypeHash } from './CType'

export interface IAttestation {
  claimHash: ICredential['rootHash']
  cTypeHash: CTypeHash
  owner: DidUri
  delegationId: IDelegationNode['id'] | null
  revoked: boolean
}

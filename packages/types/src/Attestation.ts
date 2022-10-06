/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { DidUri } from './DidDocument'
import type { IDelegationNode } from './Delegation'
import type { ICredential } from './Credential'

export interface IAttestation {
  claimHash: ICredential['rootHash']
  cTypeHash: HexString
  owner: DidUri
  delegationId: IDelegationNode['id'] | null
  revoked: boolean
}

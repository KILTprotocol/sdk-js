/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri } from './DidDocument'
import type { ICType } from './CType'
import type { IDelegationNode } from './Delegation'
import type { ICredential } from './Credential'

export interface IAttestation {
  claimHash: ICredential['rootHash']
  cTypeHash: ICType['hash']
  owner: DidUri
  delegationId: IDelegationNode['id'] | null
  revoked: boolean
}

export type CompressedAttestation = [
  IAttestation['claimHash'],
  IAttestation['cTypeHash'],
  IAttestation['owner'],
  IAttestation['revoked'],
  IAttestation['delegationId']
]

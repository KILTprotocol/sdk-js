/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { BN } from '@polkadot/util'

import type { CTypeHash } from './CType'
import type { IDelegationNode } from './Delegation'
import type { IClaimContents } from './Claim'
import type { DidUri } from './DidDocument'
import type { AssetDidUri } from './AssetDid'

/*
 * The minimal information required to issue a public credential to a given [[AssetDidUri]].
 */
export interface IPublicCredentialInput {
  /*
   * The CType has of the public credential.
   */
  cTypeHash: CTypeHash
  /*
   * The optional ID of the delegation node used to issue the credential.
   */
  delegationId: IDelegationNode['id'] | null
  /*
   * The subject of the credential.
   */
  subject: AssetDidUri
  /*
   * The content of the credential. The structure must match what the CType specifies.
   */
  claims: IClaimContents
}

/*
 * The full information of a public credential, which contains both initial input and additional information about its issuance.
 */
export interface IPublicCredential extends IPublicCredentialInput {
  /*
   * The unique ID of the credential. It is cryptographically derived from the credential content.
   *
   * The ID is formed by first concatenating the SCALE-encoded [[IPublicCredentialInput]] with the SCALE-encoded [[DidUri]] and then Blake2b hashing the result.
   */
  id: HexString
  /*
   * The KILT DID uri of the credential attester.
   */
  attester: DidUri
  /*
   * The block number at which the credential was issued.
   */
  blockNumber: BN
  /*
   * The revocation status of the credential.
   *
   * This is not to be trusted if shared by another party. It is only to trust if the [[IPublicCredential]] object is retrieved via one of the querying methods that this SDK exposes.
   */
  revoked: boolean
}

/*
 * A claim for a public credential.
 *
 * Like an [[IClaim]], but with a [[AssetDidUri]] `subject` instead of an [[IClaim]] `owner`.
 */
export interface IAssetClaim {
  cTypeHash: CTypeHash
  contents: IClaimContents
  subject: AssetDidUri
}

/**
 * The minimal partial claim from which a JSON-LD representation can be built.
 */
export type PartialAssetClaim = Partial<IAssetClaim> &
  Pick<IAssetClaim, 'cTypeHash'>

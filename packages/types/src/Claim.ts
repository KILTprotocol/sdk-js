/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IClaim
 */
import type { ICType } from './CType'
import type { IPublicIdentity } from './PublicIdentity'

/**
 * The minimal partial claim from which a JSON-LD representation can be built.
 */
export type PartialClaim = Partial<IClaim> & Pick<IClaim, 'cTypeHash'>

export type IClaimContents = Record<
  string,
  Record<string, unknown> | string | number | boolean
>
export interface IClaim {
  cTypeHash: ICType['hash']
  contents: IClaimContents
  owner: IPublicIdentity['address']
}

export type CompressedClaim = [
  IClaim['cTypeHash'],
  IClaim['owner'],
  IClaimContents
]

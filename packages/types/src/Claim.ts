/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDidDetails } from './DidDetails'
import type { ICType } from './CType'

export type IClaimContents = Record<
  string,
  Record<string, unknown> | string | number | boolean
>
export interface IClaim {
  cTypeHash: ICType['hash']
  contents: IClaimContents
  owner: IDidDetails['uri']
}

/**
 * The minimal partial claim from which a JSON-LD representation can be built.
 */
export type PartialClaim = Partial<IClaim> & Pick<IClaim, 'cTypeHash'>

export type CompressedClaim = [
  IClaim['cTypeHash'],
  IClaim['owner'],
  IClaimContents
]

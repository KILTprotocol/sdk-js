/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { CTypeHash } from './CType'
import type { Did } from './DidDocument'

type ClaimPrimitives = string | number | boolean

export interface IClaimContents {
  [key: string]:
    | ClaimPrimitives
    | IClaimContents
    | Array<ClaimPrimitives | IClaimContents>
}

export interface IClaim {
  cTypeHash: CTypeHash
  contents: IClaimContents
  owner: Did
}

/**
 * The minimal partial claim from which a JSON-LD representation can be built.
 */
export type PartialClaim = Partial<IClaim> & Pick<IClaim, 'cTypeHash'>

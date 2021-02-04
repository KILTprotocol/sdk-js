/**
 * @packageDocumentation
 * @module IClaim
 */
import { ICType } from './CType'
import { IPublicIdentity } from './PublicIdentity'

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

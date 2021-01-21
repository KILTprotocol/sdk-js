/**
 * @packageDocumentation
 * @module IClaim
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

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
  IClaimContents,
  IClaim['cTypeHash'],
  IClaim['owner']
]

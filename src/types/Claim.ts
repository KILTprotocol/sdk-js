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
export default interface IClaim {
  cTypeHash: ICType['hash']
  contents: IClaimContents
  owner: IPublicIdentity['address']
}

export type CompressedClaim = [
  IClaim['cTypeHash'],
  IClaim['owner'],
  IClaimContents
]

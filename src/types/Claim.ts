/**
 * @packageDocumentation
 * @module IClaim
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  contents: object
  cTypeHash: ICType['hash']
  owner: IPublicIdentity['address']
}

export type CompressedClaimContents = object

export type CompressedClaim = [
  CompressedClaimContents,
  IClaim['cTypeHash'],
  IClaim['owner']
]

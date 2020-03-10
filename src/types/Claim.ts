/**
 * @packageDocumentation
 * @module IClaim
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cTypeHash: ICType['hash']
  contents: IClaimContents
  owner: IPublicIdentity['address']
}

export type IClaimContents = { [key: string]: string | number | boolean }

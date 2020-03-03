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

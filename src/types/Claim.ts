/**
 * @packageDocumentation
 * @module IClaim
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cTypeHash: ICType['hash']
  contents: object
  owner: IPublicIdentity['address']
}

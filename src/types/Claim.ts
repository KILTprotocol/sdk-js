/**
 * @module TypeInterfaces/Claim
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cType: ICType['hash']
  contents: object
  owner: IPublicIdentity['address']
}

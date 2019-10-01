/**
 * @module TypeInterfaces/Claim
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cTypeHash: ICType['hash'] // Subject to change TODO: find out alternative to storing whole ICType is necessary
  cTypeSchema?: ICType['schema']
  contents: object
  owner: IPublicIdentity['address']
}

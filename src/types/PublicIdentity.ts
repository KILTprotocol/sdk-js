/**
 * @module TypeInterfaces
 * KILT-specific interfaces
 */
export default interface IPublicIdentity {
  address: string
  boxPublicKeyAsHex: string
  serviceAddress?: string
}

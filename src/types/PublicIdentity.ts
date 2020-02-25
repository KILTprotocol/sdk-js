import * as gabi from '@kiltprotocol/portablegabi'

/**
 * @packageDocumentation
 * @module IPublicIdentity
 */
export default interface IPublicIdentity {
  address: string
  boxPublicKeyAsHex: string
  serviceAddress?: string
  publicGabiKey?: gabi.AttesterPublicKey
  accumulator?: gabi.Accumulator
}

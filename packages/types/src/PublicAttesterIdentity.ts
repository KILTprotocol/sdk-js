import * as gabi from '@kiltprotocol/portablegabi'
import IPublicIdentity from './PublicIdentity'

/**
 * @packageDocumentation
 * @module IPublicAttesterIdentity
 */
export default interface IPublicAttesterIdentity extends IPublicIdentity {
  publicGabiKey?: gabi.AttesterPublicKey
  accumulator?: gabi.Accumulator
}

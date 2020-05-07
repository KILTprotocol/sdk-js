import { AttesterPublicKey, Accumulator } from '@kiltprotocol/portablegabi'
import PublicIdentity from '../identity/PublicIdentity'
import IPublicAttesterIdentity from '../types/PublicAttesterIdentity'

export default class PublicAttesterIdentity extends PublicIdentity
  implements IPublicAttesterIdentity {
  public readonly publicGabiKey: AttesterPublicKey
  public readonly accumulator: Accumulator

  /**
   * Builds a new [[PublicAttesterIdentity]] instance.
   *
   * @param address The public chain address.
   * @param boxPublicKeyAsHex The public encryption key.
   * @param publicGabiKey The privacy enhanced public key of the Attester.
   * @param accumulator The Attester's current accumulator.
   * @param serviceAddress The address of the service used to retrieve the DID.
   */
  public constructor(
    address: string,
    boxPublicKeyAsHex: string,
    publicGabiKey: AttesterPublicKey,
    accumulator: Accumulator,
    serviceAddress?: string
  ) {
    super(address, boxPublicKeyAsHex, serviceAddress)
    this.publicGabiKey = publicGabiKey
    this.accumulator = accumulator
  }
}

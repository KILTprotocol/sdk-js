import { AttesterPublicKey, Accumulator } from '@kiltprotocol/portablegabi'
import PublicIdentity from '../identity/PublicIdentity'
import IPublicAttesterIdentity from '../types/PublicAttesterIdentity'

export default class PublicAttesterIdentity extends PublicIdentity
  implements IPublicAttesterIdentity {
  public readonly publicGabiKey: AttesterPublicKey
  public readonly accumulator: Accumulator

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

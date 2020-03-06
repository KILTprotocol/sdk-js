import { AttesterPublicKey } from '@kiltprotocol/portablegabi'
import PublicIdentity from '../identity/PublicIdentity'

export default class PublicAttesterIdentity extends PublicIdentity {
  public readonly publicGabiKey: AttesterPublicKey

  public constructor(
    address: string,
    boxPublicKeyAsHex: string,
    publicGabiKey: AttesterPublicKey,
    serviceAddress?: string
  ) {
    super(address, boxPublicKeyAsHex, serviceAddress)
    this.publicGabiKey = publicGabiKey
  }
}

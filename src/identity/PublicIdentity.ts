interface IPublicIdentity {
  address: string
  boxPublicKeyAsHex: string
}

export default class PublicIdentity implements IPublicIdentity {
  public readonly address: IPublicIdentity['address']
  public readonly boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex']

  constructor(
    address: IPublicIdentity['address'],
    boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex']
  ) {
    this.address = address
    this.boxPublicKeyAsHex = boxPublicKeyAsHex
  }

  public getPublicIdentity(): IPublicIdentity {
    const { address, boxPublicKeyAsHex } = this
    return { address, boxPublicKeyAsHex }
  }
}

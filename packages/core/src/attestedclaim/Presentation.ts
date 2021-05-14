import { Crypto } from '@kiltprotocol/utils'
import type {
  IAttestation,
  IAttestedClaim,
  IPresentation,
  IPresentationOptions,
  IPresentationSigningOptions,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import AttestedClaim from './AttestedClaim'

export type SignedPresentation = Presentation &
  Pick<Required<Presentation>, 'verifierChallenge' | 'presentationSignature'>

export class Presentation extends AttestedClaim implements IPresentation {
  public verifierChallenge?: string
  public presentationSignature?: string

  constructor(
    credential: IAttestedClaim & {
      verifierChallenge?: string
      presentationSignature?: string
    }
  ) {
    super(credential)
    this.verifierChallenge = credential.verifierChallenge
    this.presentationSignature = credential.presentationSignature
  }

  public static fromPresentation(
    credential: IAttestedClaim & {
      verifierChallenge?: string
      presentationSignature?: string
    }
  ): Presentation {
    return new Presentation(credential)
  }

  public static fromAttestedClaim(
    credential: IAttestedClaim,
    {
      showAttributes,
      hideAttributes,
      signer,
      challenge,
    }: IPresentationOptions & Partial<IPresentationSigningOptions> = {}
  ): Presentation {
    const presentation = new Presentation(
      JSON.parse(JSON.stringify(credential))
    )

    // remove attributes listed in `hideAttributes` or NOT listed in `showAttributes`, if specified
    const excludedClaimProperties = showAttributes
      ? Array.from(presentation.getAttributes()).filter(
          (att) => !showAttributes.includes(att)
        )
      : []
    if (hideAttributes) {
      excludedClaimProperties.push(...hideAttributes)
    }

    presentation.request.removeClaimProperties(excludedClaimProperties)

    if (signer && challenge) {
      presentation.sign({ challenge, signer })
    }
    return presentation
  }

  public static fromRequestAndAttestation(
    request: IRequestForAttestation,
    attestation: IAttestation,
    opts: IPresentationOptions & Partial<IPresentationSigningOptions> = {}
  ): AttestedClaim {
    return Presentation.fromAttestedClaim(
      {
        request,
        attestation,
      },
      opts
    )
  }

  public sign({
    challenge,
    signer,
  }: IPresentationSigningOptions): SignedPresentation {
    this.verifierChallenge = challenge
    delete this.presentationSignature
    const signature = signer.sign(Crypto.coToUInt8(JSON.stringify(this)))
    this.presentationSignature = Crypto.u8aToHex(signature)
    return this as SignedPresentation
  }

  public isSigned(): this is SignedPresentation {
    return !!this.verifierChallenge && !!this.presentationSignature
  }

  public verifySignature(): boolean {
    if (!this.isSigned()) return false
    const { presentationSignature, ...document } = this
    return Crypto.verify(
      JSON.stringify(document),
      presentationSignature,
      this.request.claim.owner
    )
  }

  public verifyData(): boolean {
    return (!this.isSigned() || this.verifySignature()) && super.verifyData()
  }

  public async verify(): Promise<boolean> {
    return (!this.isSigned() || this.verifySignature()) && super.verify()
  }
}

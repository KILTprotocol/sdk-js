import { IAttestedClaim } from './AttestedClaim'

export interface IPresentation extends IAttestedClaim {
  verifierChallenge?: string
  presentationSignature?: string
}

export interface Signer {
  sign: (data: Uint8Array) => Uint8Array
}

export interface IPresentationSigningOptions {
  challenge: string
  signer: Signer
}

export interface IPresentationOptions {
  excludeIdentity?: boolean
  showAttributes?: string[]
  hideAttributes?: string[]
}

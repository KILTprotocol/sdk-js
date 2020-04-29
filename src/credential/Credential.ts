import * as gabi from '@kiltprotocol/portablegabi'
import IRequestForAttestation from '../types/RequestForAttestation'
import IAttestation from '../types/Attestation'
import Identity from '../identity/Identity'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import ICredential from '../types/Credential'

export default class Credential {
  public readonly reqForAtt: IRequestForAttestation
  public readonly attestation: IAttestation
  public readonly privacyCredential: gabi.Credential | null

  public static async fromRequestAndAttestation(
    claimer: Identity,
    request: IRequestForAttestation,
    attestation: IAttestation,
    session: gabi.ClaimerAttestationSession | null = null,
    attestationPE: gabi.Attestation | null = null
  ): Promise<Credential> {
    let privacyCredential: gabi.Credential | null = null

    if (session !== null && attestationPE !== null) {
      privacyCredential = await claimer.claimer.buildCredential({
        claimerSession: session,
        attestation: attestationPE,
      })
    }
    return new Credential({
      reqForAtt: request,
      attestation,
      privacyCredential,
    })
  }

  protected constructor({
    reqForAtt,
    attestation,
    privacyCredential,
  }: ICredential) {
    this.reqForAtt = reqForAtt
    this.attestation = attestation
    this.privacyCredential = privacyCredential
  }

  public createPresentation(
    excludedClaimProperties: string[],
    excludeIdentity = false
  ): AttestedClaim {
    const attClaim = new AttestedClaim(
      // clone the attestation and request for attestation because properties will be deleted later.
      // TODO: find a nice way to clone stuff
      JSON.parse(
        JSON.stringify({
          request: this.reqForAtt,
          attestation: this.attestation,
        })
      )
    )

    // remove specific attributes
    attClaim.request.removeClaimProperties(excludedClaimProperties)
    if (excludeIdentity) {
      attClaim.request.removeClaimOwner()
    }
    return attClaim
  }

  public getAttributes(): Set<string> {
    // TODO: move this to claim or contents
    return new Set(Object.keys(this.reqForAtt.claim.contents))
  }
}

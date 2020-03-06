import * as u8aUtil from '@polkadot/util/u8a'
import {
  AttesterPrivateKey,
  Attester,
  AttesterPublicKey,
  Claimer,
  Accumulator,
  AttesterAttestationSession,
  Witness,
  Attestation,
} from '@kiltprotocol/portablegabi'
import { KeyringPair } from '@polkadot/keyring/types'
import Identity from '../identity/Identity'
import { MessageBodyType, IInitiateAttestation } from '../messaging/Message'
import IRequestForAttestation from '../types/RequestForAttestation'
import PublicAttesterIdentity from './PublicAttesterIdentity'

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export default class AttesterIdentity extends Identity {
  protected attester: Attester
  public accumulator: Accumulator

  constructor(
    seed: Uint8Array,
    signKeyringPair: KeyringPair,
    claimer: Claimer,
    attester: Attester,
    accumulator: Accumulator
  ) {
    super(seed, signKeyringPair, claimer)
    this.attester = attester
    this.accumulator = accumulator
  }

  /**
   * Returns the private key used to create privacy enhanced attestations.
   *
   * @returns The private key used for attesting.
   */
  public getPrivateGabiKey(): AttesterPrivateKey {
    return this.attester.privateKey
  }

  /**
   * Returns the private key used to create privacy enhanced attestations.
   *
   * @returns The private key used for attesting.
   */
  public getPublicGabiKey(): AttesterPublicKey {
    return this.attester.publicKey
  }

  public static async buildFromIdentity(
    identity: Identity,
    validityDuration: number,
    maxAttributes: number
  ): Promise<AttesterIdentity> {
    const attester = await Attester.create(validityDuration, maxAttributes)
    const acc = await attester.createAccumulator()

    return new AttesterIdentity(
      identity.seed,
      identity.signKeyringPair,
      identity.claimer,
      attester,
      acc
    )
  }

  public static async buildFromIdentityAndKeys(
    identity: Identity,
    rawPublicKey: string,
    rawPrivateKey: string,
    accumulator?: string
  ): Promise<AttesterIdentity> {
    const privateGabiKey = new AttesterPrivateKey(rawPrivateKey)
    const publicGabiKey = new AttesterPublicKey(rawPublicKey)
    const attester = new Attester(publicGabiKey, privateGabiKey)
    let acc: Accumulator
    if (typeof accumulator !== 'undefined') {
      acc = new Accumulator(accumulator)
    } else {
      acc = await attester.createAccumulator()
    }
    const attesterId = new AttesterIdentity(
      identity.seed,
      identity.signKeyringPair,
      identity.claimer,
      attester,
      acc
    )
    attesterId.accumulator = acc
    return attesterId
  }

  public static async buildFromMnemonic(
    phraseArg?: string,
    validityDuration = ONE_YEAR_MS,
    maxAttributes = 70
  ): Promise<AttesterIdentity> {
    return this.buildFromIdentity(
      await Identity.buildFromMnemonic(phraseArg),
      validityDuration,
      maxAttributes
    )
  }

  public static async buildFromMnemonicAndKey(
    publicGabiKey: string,
    privateGabiKey: string,
    phraseArg?: string,
    accumulator?: string
  ): Promise<AttesterIdentity> {
    return this.buildFromIdentityAndKeys(
      await Identity.buildFromMnemonic(phraseArg),
      publicGabiKey,
      privateGabiKey,
      accumulator
    )
  }

  public static async buildFromSeedString(
    seedArg: string,
    validityDuration = ONE_YEAR_MS,
    maxAttributes = 70
  ): Promise<AttesterIdentity> {
    return this.buildFromIdentity(
      await Identity.buildFromSeedString(seedArg),
      validityDuration,
      maxAttributes
    )
  }

  public static async buildFromSeed(
    seed: Uint8Array,
    validityDuration = ONE_YEAR_MS,
    maxAttributes = 70
  ): Promise<AttesterIdentity> {
    return this.buildFromIdentity(
      await Identity.buildFromSeed(seed),
      validityDuration,
      maxAttributes
    )
  }

  public static async buildFromURI(
    uri: string,
    validityDuration = ONE_YEAR_MS,
    maxAttributes = 70
  ): Promise<AttesterIdentity> {
    return this.buildFromIdentity(
      await Identity.buildFromURI(uri),
      validityDuration,
      maxAttributes
    )
  }

  public static async buildFromURIAndKey(
    uri: string,
    publicGabiKey: string,
    privateGabiKey: string,
    accumulator?: string
  ): Promise<AttesterIdentity> {
    return this.buildFromIdentityAndKeys(
      await Identity.buildFromURI(uri),
      publicGabiKey,
      privateGabiKey,
      accumulator
    )
  }

  public getPublicIdentity(): PublicAttesterIdentity {
    return new PublicAttesterIdentity(
      this.signKeyringPair.address,
      u8aUtil.u8aToHex(this.boxKeyPair.publicKey),
      this.attester.publicKey,
      this.accumulator,
      this.serviceAddress
    )
  }

  public getAccumulator(): Accumulator {
    return this.accumulator
  }

  public async issuePrivacyEnhancedAttestation(
    session: AttesterAttestationSession,
    reqForAttestation: IRequestForAttestation
  ): Promise<[Witness, Attestation]> {
    if (reqForAttestation.privacyEnhanced != null) {
      const { witness, attestation } = await this.attester.issueAttestation({
        attestationSession: session,
        attestationRequest: reqForAttestation.privacyEnhanced,
        accumulator: this.accumulator,
      })
      return [witness, attestation]
    }
    throw new Error(
      'Privacy enhancement was missing in request for attestation'
    )
  }

  public async initiateAttestation(): Promise<{
    message: IInitiateAttestation
    session: AttesterAttestationSession
  }> {
    const { message, session } = await this.attester.startAttestation()
    return {
      message: {
        content: message,
        type: MessageBodyType.INITIATE_ATTESTATION,
      },
      session,
    }
  }
}

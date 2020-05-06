/**
 * The identity of an attester has an additional key pair to issue privacy enhanced attestation.
 *
 * @packageDocumentation
 * @module Identity
 * @preferred
 */
import * as u8aUtil from '@polkadot/util/u8a'
import * as gabi from '@kiltprotocol/portablegabi'
import { KeyringPair } from '@polkadot/keyring/types'
import { IRevocationHandle } from '../types/Attestation'
import Identity from '../identity/Identity'
import { MessageBodyType, IInitiateAttestation } from '../messaging/Message'
import IRequestForAttestation from '../types/RequestForAttestation'
import PublicAttesterIdentity from './PublicAttesterIdentity'
import Attestation from '../attestation/Attestation'
import getCached from '../blockchainApiConnection'

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export default class AttesterIdentity extends Identity {
  protected attester: gabi.Attester
  protected accumulator: gabi.Accumulator

  /**
   * Creates an [[AttesterIdentity]] using an identity.
   *
   * @param identity The identity that should be extended to an [[AttesterIdentity]].
   * @param validityDuration The duration for which the public key is valid.
   * @param maxAttributes The number of properties in a claim that the attester can sign.
   * @param accumulator The current accumulator of the attester.
   *
   * @returns A new [[AttesterIdentity]].
   */
  public static async buildFromIdentity(
    identity: Identity,
    validityDuration: number,
    maxAttributes: number,
    accumulator: gabi.Accumulator | null = null
  ): Promise<AttesterIdentity> {
    let acc = accumulator
    const attester = await gabi.Attester.create({
      validityDuration,
      maxAttributes,
    })
    if (acc === null) {
      acc = await attester.createAccumulator()
    }

    return new AttesterIdentity(
      identity.seed,
      identity.signKeyringPair,
      identity.claimer,
      attester,
      acc
    )
  }

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param identity The identity that should be extended to an [[AttesterIdentity]].
   * @param publicGabiKey The public portablegabi key, which should be used for the identity.
   * @param privateGabiKey The private portablegabi key that should be used for the identity.
   * @param accumulator The current accumulator of the attester.
   *
   * @returns A new [[AttesterIdentity]].
   */
  public static async buildFromIdentityAndKeys(
    identity: Identity,
    publicGabiKey: string,
    privateGabiKey: string,
    accumulator?: string
  ): Promise<AttesterIdentity> {
    const attester = new gabi.Attester(
      new gabi.AttesterPublicKey(publicGabiKey),
      new gabi.AttesterPrivateKey(privateGabiKey)
    )
    let acc: gabi.Accumulator
    if (typeof accumulator !== 'undefined') {
      acc = new gabi.Accumulator(accumulator)
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

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param phraseArg The mnemonic for the blockchain identity.
   * @param validityDuration The duration for which the public key is valid.
   * @param maxAttributes The number of properties in a claim that the attester can sign.
   *
   * @returns A new [[AttesterIdentity]].
   */
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

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param publicGabiKey The public portablegabi key, which should be used for the identity.
   * @param privateGabiKey The private portablegabi key that should be used for the identity.
   * @param phraseArg The mnemonic for the blockchain identity.
   * @param accumulator The current accumulator of the attester.
   *
   * @returns A new [[AttesterIdentity]].
   */
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

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param seedArg The seed used to create the blockchain identity.
   * @param validityDuration The duration for which the public key is valid.
   * @param maxAttributes The number of properties in a claim that the attester can sign.
   *
   * @returns A new [[AttesterIdentity]].
   */
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

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param seed The seed used to create the blockchain identity.
   * @param validityDuration The duration for which the public key is valid.
   * @param maxAttributes The number of properties in a claim that the attester can sign.
   *
   * @returns A new [[AttesterIdentity]].
   */
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

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param uri The uri from which the blockchain identity will be created.
   * @param validityDuration The duration for which the public key is valid.
   * @param maxAttributes The number of properties in a claim that the attester can sign.
   *
   * @returns A new [[AttesterIdentity]].
   */
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

  /**
   * Build a new [[AttesterIdentity]].
   *
   * @param uri The uri from which the blockchain identity will be created.
   * @param publicGabiKey The public portablegabi key, which should be used for the identity.
   * @param privateGabiKey The private portablegabi key that should be used for the identity.
   * @param accumulator The current accumulator of the attester.
   *
   * @returns A new [[AttesterIdentity]].
   */
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

  protected constructor(
    seed: Uint8Array,
    signKeyringPair: KeyringPair,
    claimer: gabi.Claimer,
    attester: gabi.Attester,
    accumulator: gabi.Accumulator
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
  public getPrivateGabiKey(): gabi.AttesterPrivateKey {
    return this.attester.privateKey
  }

  /**
   * Returns the private key used to create privacy enhanced attestations.
   *
   * @returns The private key used for attesting.
   */
  public getPublicGabiKey(): gabi.AttesterPublicKey {
    return this.attester.publicKey
  }

  /**
   * Builds a public identity out of the [[AttesterIdentity]].
   * The public identity can safely shared.
   *
   * @returns A [[PublicAttesterIdentity]].
   */
  public getPublicIdentity(): PublicAttesterIdentity {
    return new PublicAttesterIdentity(
      this.signKeyringPair.address,
      u8aUtil.u8aToHex(this.boxKeyPair.publicKey),
      this.attester.publicKey,
      this.accumulator,
      this.serviceAddress
    )
  }

  /**
   * Return the accumulator.
   * The accumulator is stored locally and might not be up-to-date with the accumulator stored on the blockchain.
   *
   * @returns The stored [[Accumulator]].
   */
  public getAccumulator(): gabi.Accumulator {
    return this.accumulator
  }

  /**
   * Creates a new [[Accumulator]]. All revoked attestations will be valid again, if this [[Accumulator]] is uploaded to the blockchain.
   *
   * @returns A new [[Accumulator]].
   */
  public async buildAccumulator(): Promise<gabi.Accumulator> {
    return this.attester.createAccumulator()
  }

  /**
   * Issues a privacy enhanced attestation.
   *
   * @param session The session that was created when the attestation session was started.
   * @param reqForAttestation The request for attestation which was created by the claimer.
   *
   * @returns A privacy enhanced attestation that can be used by a claimer to create a [[Credential]].
   */
  public async issuePrivacyEnhancedAttestation(
    session: gabi.AttesterAttestationSession,
    reqForAttestation: IRequestForAttestation
  ): Promise<[gabi.Witness, gabi.Attestation]> {
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

  /**
   * Starts a new attestation session.
   * The session object should be kept local and is needed to create an attestation later.
   * The message object should be send to the claimer.
   *
   * @returns An object containing the message and session objects.
   */
  public async initiateAttestation(): Promise<{
    message: IInitiateAttestation
    session: gabi.AttesterAttestationSession
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

  /**
   * Updates the [[Accumulator]] that is stored on the blockchain.
   *
   * @param acc The new [[Accumulator]] that should be stored on chain.
   */
  public async updateAccumulator(acc: gabi.Accumulator): Promise<void> {
    const bc = await getCached()
    await bc.portablegabi.updateAccumulator(this.signKeyringPair, acc)
    this.accumulator = acc
  }

  /**
   * Revokes an attestation.
   *
   * @param handle The revocation handle that identifies the attestation that should be revoked.
   */
  public async revokeAttestation(handle: IRevocationHandle): Promise<void> {
    if (handle.witness !== null) {
      const newAcc = await this.attester.revokeAttestation({
        witnesses: [handle.witness],
        accumulator: this.accumulator,
      })
      await this.updateAccumulator(newAcc)
    }
    await new Attestation(handle.attestation).revoke(this)
  }
}

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
   * [STATIC] [ASYNC] Builds an [[AttesterIdentity]] object from an [[Identity]] object.
   *
   * @param identity The [[Identity]] object which should be extended to an [[AttesterIdentity]].
   * @param validityDuration The duration for which the generated privacy enhanced key pair should be valid (in ms). The default value is one year.
   * @param maxAttributes The maximum number of attributes of a [[Claim]] attributes which can be signed. The default value is 70.
   * @param accumulator The current accumulator of the attester.
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
   * [STATIC] [ASYNC] Builds an [[AttesterIdentity]] object from an [[Identity]] object and a privacy enhanced key pair.
   *
   * @param identity The [[Identity]] object which should be extended to an [[AttesterIdentity]].
   * @param publicGabiKey The privacy enhanced public key of the Attester.
   * @param privateGabiKey The privacy enhanced private key of the Attester.
   * @param accumulator The Attester's current accumulator.
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
   * [STATIC] [ASYNC] Builds an [[AttesterIdentity]] object from a mnemonic string.
   *
   * @param phraseArg The mnemonic for the blockchain identity.
   * @param validityDuration The duration for which the generated privacy enhanced key pair should be valid (in ms). The default value is one year.
   * @param maxAttributes The maximum number of attributes of a [[Claim]] attributes which can be attested. The default value is 70.
   * @returns A new [[AttesterIdentity]].
   *
   * @example ```javascript
   * const mnemonic = Identity.generateMnemonic();
   * // mnemonic: "coast ugly state lunch repeat step armed goose together pottery bind mention"
   *
   * await AttesterIdentity.buildFromMnemonic(mnemonic);
   * ```
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
   * [STATIC] [ASYNC] Builds an [[AttesterIdentity]] object from a mnemonic string and a privacy enhanced key pair.
   *
   * @param publicGabiKey The privacy enhanced public key of the Attester.
   * @param privateGabiKey The privacy enhanced private key of the Attester.
   * @param phraseArg The mnemonic for the blockchain identity.
   * @param accumulator The Attester's current accumulator.
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
   * [STATIC] [ASYNC] Builds an [[AttesterIdentity]], generated from a seed hex string.
   *
   * @param seedArg The seed used to create the blockchain identity (as string starting with 0x).
   * @param validityDuration The duration for which the generated privacy enhanced key pair should be valid (in ms). The default value is one year.
   * @param maxAttributes The maximum number of attributes of a [[Claim]] attributes which can be attested. The default value is 70.
   * @returns A new [[AttesterIdentity]].
   *
   * @example ```javascript
   * const seed =
   *   '0x6ce9fd060c70165c0fc8da25810d249106d5df100aa980e0d9a11409d6b35261';
   * await AttesterIdentity.buildFromSeedString(seed);
   * ```
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
   * [STATIC] [ASYNC] Builds a new [[AttesterIdentity]], generated from a seed (Secret Seed).
   *
   * @param seed The seed used to create the blockchain identity (as an Uint8Array with 24 arbitrary numbers).
   * @param validityDuration The duration for which the generated privacy enhanced key pair should be valid (in ms). The default value is one year.
   * @param maxAttributes The maximum number of attributes of a [[Claim]] attributes which can be attested. The default value is 70.
   * @returns A new [[AttesterIdentity]].
   * @example ```javascript
   * // prettier-ignore
   * const seed = new Uint8Array([108, 233, 253,  6,  12, 112,  22,  92,
   *                               15, 200, 218, 37, 129,  13,  36, 145,
   *                                6, 213, 223, 16,  10, 169, 128, 224,
   *                              217, 161,  20,  9, 214, 179,  82,  97
   *                            ]);
   * await AttesterIdentity.buildFromSeed(seed);
   * ```
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
   * [STATIC] [ASYNC] Builds a new [[AttesterIdentity]], generated from a uniform resource identifier (URIs).
   *
   * @param uri The uri from which the blockchain identity will be created.
   * @param validityDuration The duration for which the generated privacy enhanced key pair should be valid (in ms). The default value is one year.
   * @param maxAttributes The maximum number of attributes of a [[Claim]] attributes which can be attested. The default value is 70.
   * @returns A new [[AttesterIdentity]].
   * @example ```javascript
   * AttesterIdentity.buildFromURI('//Bob');
   * ```
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
   * [STATIC] [ASYNC] Builds a new [[AttesterIdentity]], generated from a uniform resource identifier (URIs).
   *
   * @param uri The uri from which the blockchain identity will be created.
   * @param publicGabiKey The privacy enhanced public key of the Attester.
   * @param privateGabiKey The privacy enhanced private key of the Attester.
   * @param accumulator The Attester's current accumulator.
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
   * @returns The [[PublicAttesterIdentity]] consisting of
   * the signing keyring pair address,
   * the public address as hex,
   * the privacy enhanced public key,
   * the accumulator and the service address.
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
   * [ASYNC] Creates a privacy enhanced [[Attestation]] for a [[Claim]].
   *
   * @param session The Attester's session which was generated in [[initiateAttestation]].
   * @param reqForAttestation The Claimer's request for [[Attestation]] including all required data to attest the [[Claim]]:
   * The [[Claim]] itself, the Claimer's signature,
   * the [[claimHashTree]], the [[cTypeHash]], the unique identifier for the delegation,
   * an array of [[AttestedClaim]]s and the rootHash.
   * @returns A privacy enhanced attestation in array form which represents
   * at **index 0** the revocation witness which can be used to revoke the [[Attestation]]
   * and at **index 1** the [[Attestation]] object which should be sent to the Claimer.
   * It can be used to create a [[Credential]].
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
   * [ASYNC] Starts a new [[Attestation]] session.
   *
   * @returns A session and a message object.
   * The **message** should be sent over to the Claimer to be used in [[requestAttestion]].
   * The **session** should be kept private and used in [[issueAttestation]].
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
   * [ASYNC] Revokes an [[Attestation]] by removing the corresponding revocation witness from the Attester's accumulator.
   *
   * @param handle The revocation handle which holds the [[Attestation]] and the revocation witness created in [[issueAttestation]].
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

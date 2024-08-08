/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  base58Decode,
  base58Encode,
  randomAsU8a,
  sr25519PairFromSeed,
  sr25519Sign,
  sr25519Verify,
} from '@polkadot/util-crypto'
import { u8aEq } from '@polkadot/util'

import { KiltCredentialV1 } from '@kiltprotocol/credentials'

// @ts-expect-error not a typescript module
import cryptold from 'crypto-ld' // cjs module
import type { JSigsSigner, JSigsVerifier } from './types.js'

interface LDKeyPairProps {
  id?: string
  controller?: string
  revoked?: string
}
const { LDKeyPair } = cryptold as {
  LDKeyPair: {
    new (props: LDKeyPairProps): LDKeyPairProps
  }
}

/* eslint-disable no-use-before-define */
export type ExportedKey = Pick<Sr25519VerificationKey2020, 'type'> &
  Partial<
    Pick<
      Sr25519VerificationKey2020,
      'controller' | 'id' | 'privateKeyBase58' | 'publicKeyBase58' | 'revoked'
    >
  > & { '@context'?: string }

const SUITE_ID = 'Sr25519VerificationKey2020'

const Sr25519MulticodecPrefix = new Uint8Array([0xef, 0x01])

/* eslint-disable no-use-before-define */
/* eslint-disable jsdoc/require-param */
/* eslint-disable jsdoc/check-param-names */

export class Sr25519VerificationKey2020 extends LDKeyPair {
  // Used by CryptoLD harness for dispatching.
  public static readonly suite = SUITE_ID
  // Used by CryptoLD harness's fromKeyId() method.
  public static readonly SUITE_CONTEXT = KiltCredentialV1.CONTEXT_URL

  public type: string
  public publicKeyBase58: string
  public privateKeyBase58?: string

  /**
   * An implementation of the Sr25519VerificationKey spec, for use with
   * Linked Data Proofs.
   *
   * @param options - Options hashmap.
   * @param options.publicKeyBase58 - Base58btc encoded Public Key.
   * @param options.controller - Controller DID or document url.
   * @param options.id - The key ID.
   * @param options.privateKeyBase58 - Base58btc Private Key.
   * @param options.revoked - Timestamp of when the key has been
   *   revoked, in RFC3339 format. If not present, the key itself is considered
   *   not revoked. Note that this mechanism is slightly different than DID
   *   Document key revocation, where a DID controller can revoke a key from
   *   that DID by removing it from the DID Document.
   */
  constructor(options: {
    publicKeyBase58: string
    controller?: string
    id?: string
    privateKeyBase58?: string
    revoked?: string
  }) {
    super(options)
    this.type = SUITE_ID
    this.publicKeyBase58 = options.publicKeyBase58
    if (typeof this.publicKeyBase58 !== 'string') {
      throw new TypeError('The "publicKeyBase58" property is required.')
    }
    this.privateKeyBase58 = options.privateKeyBase58
  }

  /**
   * Generates a KeyPair with an optional deterministic seed.
   *
   * @param options - See LDKeyPair docstring for full list.
   * @param options.seed -
   * a 32-byte array seed for a deterministic key.
   *
   * @returns Generates a key pair.
   */
  static async generate(
    options: {
      seed?: Uint8Array | string
      controller?: string
      id?: string
      revoked?: string
    } = {}
  ): Promise<Sr25519VerificationKey2020> {
    const keyObject = sr25519PairFromSeed(options.seed ?? randomAsU8a(32))

    return new Sr25519VerificationKey2020({
      publicKeyBase58: base58Encode(keyObject.publicKey),
      privateKeyBase58: base58Encode(keyObject.secretKey),
      ...options,
    })
  }

  static async from(
    ...options: ConstructorParameters<typeof Sr25519VerificationKey2020>
  ): Promise<Sr25519VerificationKey2020> {
    return new Sr25519VerificationKey2020(...options)
  }

  /**
   * Returns a signer object for use with Linked Data Proofs.
   *
   * @example
   * > const signer = keyPair.signer();
   * > signer
   * { sign: [AsyncFunction: sign] }
   * > signer.sign({data});
   *
   * @returns A signer for the json-ld block.
   */
  signer(): JSigsSigner {
    const signer = Sr25519SignerFactory(this)
    return { ...signer, id: this.id }
  }

  /**
   * Returns a verifier object for use with signature suites.
   *
   * @example
   * > const verifier = keyPair.verifier();
   * > verifier
   * { verify: [AsyncFunction: verify] }
   * > verifier.verify(key);
   *
   * @returns Used to verify jsonld-signatures.
   */
  verifier(): JSigsVerifier {
    const verifier = Sr25519VerifierFactory(this)
    return { ...verifier, id: this.id }
  }

  /**
   * Exports the serialized representation of the KeyPair
   * and other information that json-ld Signatures can use to form a proof.
   *
   * @param options - Options hashmap.
   * @param options.publicKey - Export public key material?
   * @param options.privateKey - Export private key material?
   * @param options.includeContext - Include JSON-LD context?
   *
   * @returns A public key object
   *   information used in verification methods by signatures.
   */
  export({
    publicKey = false,
    privateKey = false,
    includeContext = false,
  } = {}): ExportedKey {
    if (!(publicKey || privateKey)) {
      throw new TypeError(
        'Export requires specifying either "publicKey" or "privateKey".'
      )
    }
    const exportedKey: ExportedKey = {
      id: this.id,
      type: this.type,
    }
    if (includeContext) {
      exportedKey['@context'] = Sr25519VerificationKey2020.SUITE_CONTEXT
    }
    if (typeof this.controller !== 'undefined') {
      exportedKey.controller = this.controller
    }
    if (publicKey) {
      exportedKey.publicKeyBase58 = this.publicKeyBase58
    }
    if (privateKey) {
      exportedKey.privateKeyBase58 = this.privateKeyBase58
    }
    if (typeof this.revoked === 'string') {
      exportedKey.revoked = this.revoked
    }
    return exportedKey
  }

  /**
   * Generates and returns a multiformats encoded sr25519 public key
   * fingerprint (for use with cryptonyms, for example).
   *
   * @see https://github.com/multiformats/multicodec
   *
   * @param publicKey Metadata object containing the public key material.
   * @param publicKey.publicKeyBase58 - The base58 encoded public key material.
   *
   * @returns The fingerprint.
   */
  static fingerprintFromPublicKey({
    publicKeyBase58,
  }: {
    publicKeyBase58: string
  }): string {
    // sr25519 cryptonyms are multicodec encoded values, specifically:
    // (multicodec sr25519-pub 0xef01 + key bytes)

    const pubkeyBytes = base58Decode(publicKeyBase58)

    const buffer = new Uint8Array(2 + pubkeyBytes.length)
    buffer.set(Sr25519MulticodecPrefix)
    buffer.set(pubkeyBytes, 2)
    // prefix with `z` to indicate multi-base base58btc encoding
    return `z${base58Encode(buffer)}`
  }

  /**
   * Generates and returns a multiformats encoded sr25519 public key
   * fingerprint (for use with cryptonyms, for example).
   *
   * @see https://github.com/multiformats/multicodec
   *
   * @returns The fingerprint.
   */
  fingerprint(): string {
    const { publicKeyBase58 } = this
    return Sr25519VerificationKey2020.fingerprintFromPublicKey({
      publicKeyBase58,
    })
  }

  /**
   * Tests whether the fingerprint was generated from a given key pair.
   *
   * @example
   * > srKeyPair.verifyFingerprint({fingerprint: 'z2S2Q6MkaFJewa'});
   * {valid: true};
   * @param publicKey - A Base58 public key.
   * @param publicKey.fingerprint The key's fingerprint.
   *
   * @returns An object indicating valid is true or false.
   */
  verifyFingerprint({ fingerprint }: { fingerprint?: string } = {}): object {
    // fingerprint should have `z` prefix indicating
    // that it's multi-base encoded
    if (!(typeof fingerprint === 'string' && fingerprint[0] === 'z')) {
      return {
        error: new Error('`fingerprint` must be a multibase encoded string.'),
        valid: false,
      }
    }
    let fingerprintBuffer
    try {
      fingerprintBuffer = base58Decode(fingerprint.slice(1))
    } catch (e) {
      return { error: e, valid: false }
    }
    let publicKeyBuffer
    try {
      publicKeyBuffer = base58Decode(this.publicKeyBase58)
    } catch (e) {
      return { error: e, valid: false }
    }

    // validate the first two multicodec bytes 0xef01
    const valid =
      fingerprintBuffer[0] === Sr25519MulticodecPrefix[0] &&
      fingerprintBuffer[1] === Sr25519MulticodecPrefix[1] &&
      u8aEq(publicKeyBuffer, fingerprintBuffer.slice(2))
    if (!valid) {
      return {
        error: new Error('The fingerprint does not match the public key.'),
        valid: false,
      }
    }
    return { valid }
  }
}

/**
 * Returns an object with an async sign function.
 * The sign function is bound to the KeyPair
 * and then returned by the KeyPair's signer method.
 *
 * @param key - A key pair instance.
 * @example
 * > const mySigner = Sr25519SignerFactory(edKeyPair);
 * > await mySigner.sign({data})
 *
 * @returns An object with an async function sign
 * using the private key passed in.
 */
function Sr25519SignerFactory(key: Sr25519VerificationKey2020): {
  sign: (data: { data: Uint8Array }) => Promise<Uint8Array>
} {
  if (typeof key.privateKeyBase58 !== 'string') {
    return {
      async sign() {
        throw new Error('No private key to sign with.')
      },
    }
  }
  const secretKey = base58Decode(key.privateKeyBase58)
  const publicKey = base58Decode(key.publicKeyBase58)
  return {
    async sign({ data }) {
      const signature = sr25519Sign(data, { secretKey, publicKey })
      return signature
    },
  }
}

/**
 * Returns an object with an async verify function.
 * The verify function is bound to the KeyPair
 * and then returned by the KeyPair's verifier method.
 *
 * @param key - An Sr25519VerificationKey2020.
 * @example
 * > const myVerifier = Sr25519Verifier(edKeyPair);
 * > await myVerifier.verify({data, signature});
 *
 * @returns An async verifier specific
 * to the key passed in.
 */
function Sr25519VerifierFactory(key: Sr25519VerificationKey2020): {
  verify: (data: {
    data: Uint8Array
    signature: Uint8Array
  }) => Promise<boolean>
} {
  const publicKey = base58Decode(key.publicKeyBase58)
  return {
    async verify({ data, signature }) {
      return sr25519Verify(data, signature, publicKey)
    },
  }
}

/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeBase58BtcMultikey } from '@kiltprotocol/jcs-data-integrity-proofs-common'
// @ts-expect-error Not a typescript module
import * as varint from 'varint'

import {
  Base58BtcMultibaseString,
  KeyringPair,
  MultibaseKeyPair,
  MultibasePublicKey,
  MultibaseSecretKey,
} from '@kiltprotocol/types'
import { u8aConcat } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'
import { DidError } from './SDKErrors.js'

const MULTICODEC_SECP256K1_PREFIXES = [0xe7, 0x1301] as const
const MULTICODEC_X25519_PREFIXES = [0xec, 0x1302] as const
const MULTICODEC_ED25519_PREFIXES = [0xed, 0x1300] as const
const MULTICODEC_SR25519_PREFIXES = [0xef, 0x1303] as const

type KeyTypeString = 'ed25519' | 'sr25519' | 'x25519' | 'secp256k1'

export type KnownTypeString = KeyringPair['type'] | KeyTypeString

function mapTypeStringToPrefixes(type: KnownTypeString): [number, number] {
  switch (type) {
    case 'ecdsa':
    case 'secp256k1':
    case 'ethereum':
      return [...MULTICODEC_SECP256K1_PREFIXES]
    case 'sr25519':
      return [...MULTICODEC_SR25519_PREFIXES]
    case 'x25519':
      return [...MULTICODEC_X25519_PREFIXES]
    case 'ed25519':
      return [...MULTICODEC_ED25519_PREFIXES]
    default:
      throw new DidError(`The provided key type "${type}" is not supported.`)
  }
}

// TODO: This could also be exposed in a new release candidate of the `@kiltprotocol/jcs-data-integrity-proofs-common` package.
function multibase58BtcKeyBytesEncoding(
  key: Uint8Array,
  keyPrefix: number
): Base58BtcMultibaseString {
  const varintEncodedPrefix = varint.encode(keyPrefix)
  const prefixedKey = u8aConcat(varintEncodedPrefix, key)
  const base58BtcEncodedKey = base58Encode(prefixedKey)
  return `z${base58BtcEncodedKey}`
}

export function encodeMultibaseKeypair(
  args: Pick<KeyringPair, 'publicKey'> & {
    type: KnownTypeString
    secretKey: Uint8Array
  }
): MultibaseKeyPair
export function encodeMultibaseKeypair(
  args: Pick<KeyringPair, 'publicKey'> & {
    type: KnownTypeString
  }
): MultibasePublicKey
/**
 * Calculate the Multikey representation of a keypair given its type and public/secret keys.
 *
 * @param keypair The input keypair to encode as Multikey.
 * @param keypair.type The keypair type indicated by a type string.
 * @param keypair.publicKey The keypair public key.
 * @param keypair.secretKey Optionally, the keypair's secret key.
 * @returns The Multikey representation (i.e., multicodec-prefixed, then multibase encoded) of the provided keypair.
 */
export function encodeMultibaseKeypair({
  type,
  publicKey,
  secretKey,
}: Pick<KeyringPair, 'publicKey'> & {
  type: KnownTypeString
  secretKey?: Uint8Array
}): MultibasePublicKey & Partial<MultibaseSecretKey> {
  const [multiCodecPublicKeyPrefix, multiCodedSecretKeyPrefix] =
    mapTypeStringToPrefixes(type)

  const keypair: MultibasePublicKey & Partial<MultibaseSecretKey> = {
    publicKeyMultibase: multibase58BtcKeyBytesEncoding(
      publicKey,
      multiCodecPublicKeyPrefix
    ),
  }
  if (secretKey) {
    keypair.secretKeyMultibase = multibase58BtcKeyBytesEncoding(
      secretKey,
      multiCodedSecretKeyPrefix
    )
  }

  return keypair
}

const publicKeyPrefixes: Record<number, KeyTypeString> = {
  [MULTICODEC_SECP256K1_PREFIXES[0]]: 'secp256k1',
  [MULTICODEC_X25519_PREFIXES[0]]: 'x25519',
  [MULTICODEC_ED25519_PREFIXES[0]]: 'ed25519',
  [MULTICODEC_SR25519_PREFIXES[0]]: 'sr25519',
}

const secretKeyPrefixes: Record<number, KeyTypeString> = {
  [MULTICODEC_SECP256K1_PREFIXES[1]]: 'secp256k1',
  [MULTICODEC_X25519_PREFIXES[1]]: 'x25519',
  [MULTICODEC_ED25519_PREFIXES[1]]: 'ed25519',
  [MULTICODEC_SR25519_PREFIXES[1]]: 'sr25519',
}

export function decodeMultibaseKeypair(keypair: MultibaseKeyPair): Pick<
  KeyringPair,
  'publicKey'
> & {
  secretKey: Uint8Array
  type: KeyTypeString
}
export function decodeMultibaseKeypair(
  keyPairPublicKey: MultibasePublicKey
): Pick<KeyringPair, 'publicKey'> & { type: KeyTypeString }
/**
 * Decode a Multikey representation of a verification method into its fundamental components: the public key and the key type.
 *
 * @param keyPairMultibase The verification method's public/private keys in Multikey format (i.e., multicodec-prefixed, then multibase encoded).
 * @param keyPairMultibase.publicKeyMultibase The keypair's public key, encoded in Multikey format.
 * @param keyPairMultibase.secretKeyMultibase Optionally, the keypair's secret key, encoded in Multikey format.
 * @returns The decoded `publicKey` (and possibly `secretKey`) plus a key `type`.
 */
export function decodeMultibaseKeypair({
  publicKeyMultibase,
  secretKeyMultibase,
}: MultibasePublicKey & Partial<MultibaseSecretKey>): Pick<
  KeyringPair,
  'publicKey'
> & { type: KeyTypeString; secretKey?: Uint8Array } {
  const { keyBytes, prefix } = decodeBase58BtcMultikey(publicKeyMultibase)

  const keyType = publicKeyPrefixes[prefix]
  if (keyType === undefined) {
    throw new DidError(
      `Cannot decode key type for multibase key "${publicKeyMultibase}".`
    )
  }

  const result: ReturnType<typeof decodeMultibaseKeypair> = {
    type: keyType,
    publicKey: keyBytes,
  }

  if (typeof secretKeyMultibase === 'string') {
    const decodedKey = decodeBase58BtcMultikey(secretKeyMultibase)
    const secretKeyType = secretKeyPrefixes[decodedKey.prefix]
    if (secretKeyType !== keyType) {
      throw new Error(
        `Secret key type ${secretKeyType} (prefix ${decodedKey.prefix}) does not match public key type ${keyType} (prefix ${prefix})`
      )
    }
    result.secretKey = decodedKey.keyBytes
  }

  return result
}

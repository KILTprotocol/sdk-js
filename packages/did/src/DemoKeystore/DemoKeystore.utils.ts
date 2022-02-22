/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  blake2AsHex,
  blake2AsU8a,
  encodeAddress,
  randomAsHex,
} from '@polkadot/util-crypto'

import { DidKey, KeyRelationship } from '@kiltprotocol/types'

import {
  getEncryptionKeyTypeForEncryptionAlgorithm,
  getKiltDidFromIdentifier,
  getVerificationKeyTypeForSigningAlgorithm,
} from '../Did.utils.js'
import { LightDidDetails, FullDidDetails } from '../DidDetails/index.js'
import {
  DidConstructorDetails,
  PublicKeys,
  ServiceEndpoints,
  LightDidSupportedVerificationKeyType,
} from '../types.js'
import {
  DemoKeystore,
  EncryptionAlgorithms,
  SigningAlgorithms,
} from './DemoKeystore.js'

// Given a seed, creates a light DID with an authentication and an encryption key.
export async function createMinimalLightDidFromSeed(
  keystore: DemoKeystore,
  seed?: string
): Promise<LightDidDetails> {
  const genSeed = seed || randomAsHex(32)
  const authKey = await keystore.generateKeypair({
    alg: SigningAlgorithms.Sr25519,
    seed: `${genSeed}//auth`,
  })
  const encKey = await keystore.generateKeypair({
    alg: EncryptionAlgorithms.NaclBox,
    seed: `${genSeed}//enc`,
  })
  const details = LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: authKey.publicKey,
      type: getVerificationKeyTypeForSigningAlgorithm(
        authKey.alg
      ) as LightDidSupportedVerificationKeyType,
    },
    encryptionKey: {
      publicKey: encKey.publicKey,
      type: getEncryptionKeyTypeForEncryptionAlgorithm(encKey.alg),
    },
  })
  return details
}

/**
 * Creates an instance of [[FullDidDetails]] for local use, e.g., in testing. Will not work on-chain because identifiers are generated ad-hoc.
 *
 * @param keystore The keystore to generate and store the DID private keys.
 * @param mnemonicOrHexSeed The mnemonic phrase or HEX seed for key generation.
 * @param generationOptions The additional options for generation.
 * @param generationOptions.signingKeyType One of the supported [[SigningAlgorithms]] to generate the DID verification keys.
 * @param generationOptions.encryptionKeyType One of the supported [[EncryptionAlgorithms]] to generate the DID encryption keys.
 * @param generationOptions.keyRelationships The set of key relationships to indicate which keys must be added to the DID.
 * @param generationOptions.endpoints The set of service endpoints that must be added to the DID.
 *
 * @returns A promise resolving to a [[FullDidDetails]] object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoFullDidFromSeed(
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  {
    signingKeyType = SigningAlgorithms.Sr25519,
    encryptionKeyType = EncryptionAlgorithms.NaclBox,
    keyRelationships = new Set([
      KeyRelationship.assertionMethod,
      KeyRelationship.capabilityDelegation,
      KeyRelationship.keyAgreement,
    ]),
    endpoints = {},
  }: {
    signingKeyType?: SigningAlgorithms
    encryptionKeyType?: EncryptionAlgorithms
    keyRelationships?: Set<Omit<KeyRelationship, 'authentication'>>
    endpoints?: ServiceEndpoints
  } = {}
): Promise<FullDidDetails> {
  const identifier = encodeAddress(blake2AsU8a(mnemonicOrHexSeed, 256), 38)
  const did = getKiltDidFromIdentifier(identifier, 'full')

  const generateKeypairForDid = async (
    derivation: string,
    keytype: SigningAlgorithms | EncryptionAlgorithms
  ): Promise<DidKey> => {
    const seed = derivation
      ? `${mnemonicOrHexSeed}//${derivation}`
      : mnemonicOrHexSeed
    const { publicKey, alg } = await keystore.generateKeypair<any>({
      alg: keytype,
      seed,
    })
    return {
      id: `${blake2AsHex(publicKey, 256)}`,
      publicKey,
      type: getVerificationKeyTypeForSigningAlgorithm(alg),
    }
  }

  const authKey = await generateKeypairForDid('auth', signingKeyType)

  const fullDidCreationDetails: DidConstructorDetails = {
    did,
    keyRelationships: {
      authentication: new Set([authKey.id]),
    },
    keys: {
      [authKey.id]: authKey,
    },
    serviceEndpoints: endpoints,
  }

  if (keyRelationships.has(KeyRelationship.keyAgreement)) {
    const encKey = await generateKeypairForDid('enc', encryptionKeyType)
    fullDidCreationDetails.keyRelationships.keyAgreement = new Set([encKey.id])
    fullDidCreationDetails.keys[encKey.id] = encKey
  }
  if (keyRelationships.has(KeyRelationship.assertionMethod)) {
    const attKey = await generateKeypairForDid('att', signingKeyType)
    fullDidCreationDetails.keyRelationships.assertionMethod = new Set([
      attKey.id,
    ])
    fullDidCreationDetails.keys[attKey.id] = attKey
  }
  if (keyRelationships.has(KeyRelationship.capabilityDelegation)) {
    const delKey = await generateKeypairForDid('del', signingKeyType)
    fullDidCreationDetails.keyRelationships.capabilityDelegation = new Set([
      delKey.id,
    ])
    fullDidCreationDetails.keys[delKey.id] = delKey
  }

  return new FullDidDetails({
    ...fullDidCreationDetails,
    identifier,
  })
}

export async function createLocalDemoFullDidFromLightDid(
  lightDid: LightDidDetails
): Promise<FullDidDetails> {
  const { identifier } = lightDid
  const authKey = lightDid.authenticationKey
  const encKey = lightDid.encryptionKey

  const keys: PublicKeys = {
    [authKey.id]: authKey,
    [authKey.id]: authKey,
    [authKey.id]: authKey,
  }
  if (encKey) {
    keys[encKey.id] = encKey
  }

  const fullDidCreationDetails: DidConstructorDetails = {
    did: getKiltDidFromIdentifier(identifier, 'full'),
    keyRelationships: {
      authentication: new Set([authKey.id]),
      keyAgreement: encKey ? new Set([encKey.id]) : new Set([]),
      assertionMethod: new Set([authKey.id]),
      capabilityDelegation: new Set([authKey.id]),
    },
    keys,
    serviceEndpoints: {},
  }

  return new FullDidDetails({
    ...fullDidCreationDetails,
    identifier,
  })
}

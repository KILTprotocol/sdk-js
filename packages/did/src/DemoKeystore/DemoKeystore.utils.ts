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

import { DidKey, EncryptionKeyType } from '@kiltprotocol/types'

import { getKiltDidFromIdentifier } from '../Did.utils.js'
import { LightDidDetails, FullDidDetails } from '../DidDetails/index.js'
import { DidConstructorDetails, PublicKeys } from '../types.js'
import {
  DemoKeystore,
  EncryptionAlgorithms,
  SigningAlgorithms,
} from './DemoKeystore.js'
import { LightDidSupportedVerificationKeyTypes } from '../DidDetails/LightDidDetails.utils.js'

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
      type: DemoKeystore.getKeyTypeForAlg(
        authKey.alg
      ) as LightDidSupportedVerificationKeyTypes,
    },
    encryptionKey: {
      publicKey: encKey.publicKey,
      type: DemoKeystore.getKeyTypeForAlg(encKey.alg) as EncryptionKeyType,
    },
  })
  return details
}

/**
 * Creates an instance of [[FullDidDetails]] for local use, e.g., in testing. Will not work on-chain because identifiers are generated ad-hoc.
 *
 * @param keystore The keystore to generate and store the DID private keys.
 * @param mnemonicOrHexSeed The mnemonic phrase or HEX seed for key generation.
 * @param signingKeyType One of the supported [[SigningAlgorithms]] to generate the DID authentication key.
 *
 * @returns A promise resolving to a [[FullDidDetails]] object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoFullDidFromSeed(
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = SigningAlgorithms.Sr25519
): Promise<FullDidDetails> {
  const identifier = encodeAddress(blake2AsU8a(mnemonicOrHexSeed, 256), 38)
  const did = getKiltDidFromIdentifier(identifier, 'full')

  const generateKeypairForDid = async (
    derivation: string,
    alg: string,
    keytype: SigningAlgorithms
  ): Promise<DidKey> => {
    const seed = derivation
      ? `${mnemonicOrHexSeed}//${derivation}`
      : mnemonicOrHexSeed
    const keyId = `${blake2AsHex(seed, 64)}`
    const { publicKey } = await keystore.generateKeypair<any>({
      alg,
      seed,
    })
    return {
      id: keyId,
      publicKey,
      type: DemoKeystore.getKeyTypeForAlg(keytype),
    }
  }

  const authKey = await generateKeypairForDid(
    'auth',
    signingKeyType,
    signingKeyType
  )
  const encKey = await generateKeypairForDid(
    'enc',
    signingKeyType,
    signingKeyType
  )
  const attKey = await generateKeypairForDid(
    'att',
    signingKeyType,
    signingKeyType
  )
  const delKey = await generateKeypairForDid(
    'del',
    signingKeyType,
    signingKeyType
  )

  const fullDidCreationDetails: DidConstructorDetails = {
    did,
    keyRelationships: {
      authentication: new Set([authKey.id]),
      keyAgreement: new Set([encKey.id]),
      assertionMethod: new Set([attKey.id]),
      capabilityDelegation: new Set([delKey.id]),
    },
    keys: {
      [authKey.id]: authKey,
      [encKey.id]: encKey,
      [attKey.id]: attKey,
      [delKey.id]: delKey,
    },
    serviceEndpoints: {},
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

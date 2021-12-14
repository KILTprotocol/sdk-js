/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidKey } from '@kiltprotocol/types'
import { blake2AsHex, blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'

import { getKiltDidFromIdentifier } from '../Did.utils'
import { FullDidDetails } from '../DidDetails'
import { DidCreationDetails } from '../types'
import { DemoKeystore, SigningAlgorithms } from './DemoKeystore'

/**
 * Creates an instance of [[FullDidDetails]] for local use, e.g., in testing. Will not work on-chain because identifiers are generated ad-hoc.
 *
 * @param keystore The keystore to generate and store the DID private keys.
 * @param mnemonicOrHexSeed The mnemonic phrase or HEX seed for key generation.
 * @param signingKeyType One of the supported [[SigningAlgorithms]] to generate the DID authentication key.
 *
 * @returns A promise resolving to a [[FullDidDetails]] object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoDidFromSeed(
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = SigningAlgorithms.Sr25519
): Promise<FullDidDetails> {
  const identifier = encodeAddress(blake2AsU8a(mnemonicOrHexSeed, 256), 38)
  const did = getKiltDidFromIdentifier(identifier, 'full')

  const generateKeypairForDid = async (
    derivation: string,
    alg: string,
    keytype: string
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
      type: keytype,
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

  const fullDidCreationDetails: DidCreationDetails = {
    did,
    keyRelationships: {
      authentication: new Set([authKey.id]),
      keyAgreement: new Set([encKey.id]),
      assertionMethod: new Set([attKey.id]),
      capabilityDelegation: new Set([delKey.id]),
    },
    keys: new Map([
      [authKey.id, authKey],
      [encKey.id, encKey],
      [attKey.id, attKey],
      [delKey.id, delKey],
    ]),
    serviceEndpoints: new Map(),
  }

  return new FullDidDetails({
    ...fullDidCreationDetails,
    identifier,
  })
}

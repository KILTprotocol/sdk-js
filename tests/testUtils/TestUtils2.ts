/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { blake2AsHex, blake2AsU8a } from '@polkadot/util-crypto'

import type {
  CryptoCallbacksV2,
  DidDocument,
  DidDocumentV2,
  DidKey,
  DidServiceEndpoint,
  DidVerificationKey,
  KeyRelationship,
  KeyringPair,
  KiltEncryptionKeypair,
  KiltKeyringPair,
  LightDidSupportedVerificationKeyType,
  NewLightDidVerificationKey,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'

import { Blockchain } from '@kiltprotocol/chain-helpers'
import { ConfigService } from '@kiltprotocol/config'

export type EncryptionKeyToolCallback = (
  didDocument: DidDocumentV2.DidDocument
) => CryptoCallbacksV2.EncryptCallback

/**
 * Generates a callback that can be used for encryption.
 *
 * @param secretKey The options parameter.
 * @param secretKey.secretKey The key to use for encryption.
 * @returns The callback.
 */
export function makeEncryptCallback({
  secretKey,
}: KiltEncryptionKeypair): EncryptionKeyToolCallback {
  return (didDocument) => {
    return async function encryptCallback({ data, peerPublicKey }) {
      const keyId = didDocument.keyAgreement?.[0]
      if (keyId === undefined) {
        throw new Error(`Encryption key not found in did "${didDocument.id}"`)
      }
      const verificationMethod = didDocument.verificationMethod.find(
        (v) => v.id === keyId
      ) as DidDocumentV2.VerificationMethod
      const { box, nonce } = Crypto.encryptAsymmetric(
        data,
        peerPublicKey,
        secretKey
      )
      return {
        nonce,
        data: box,
        verificationMethod,
      }
    }
  }
}

/**
 * Generates a callback that can be used for decryption.
 *
 * @param secretKey The options parameter.
 * @param secretKey.secretKey The key to use for decryption.
 * @returns The callback.
 */
export function makeDecryptCallback({
  secretKey,
}: KiltEncryptionKeypair): CryptoCallbacksV2.DecryptCallback {
  return async function decryptCallback({ data, nonce, peerPublicKey }) {
    const decrypted = Crypto.decryptAsymmetric(
      { box: data, nonce },
      peerPublicKey,
      secretKey
    )
    if (decrypted === false) throw new Error('Decryption failed')
    return { data: decrypted }
  }
}

export interface EncryptionKeyTool {
  keyAgreement: [KiltEncryptionKeypair]
  encrypt: EncryptionKeyToolCallback
  decrypt: CryptoCallbacksV2.DecryptCallback
}

/**
 * Generates a keypair suitable for encryption.
 *
 * @param seed {string} Input to generate the keypair from.
 * @returns Object with secret and public key and the key type.
 */
export function makeEncryptionKeyTool(seed: string): EncryptionKeyTool {
  const keypair = Crypto.makeEncryptionKeypairFromSeed(blake2AsU8a(seed, 256))

  const encrypt = makeEncryptCallback(keypair)
  const decrypt = makeDecryptCallback(keypair)

  return {
    keyAgreement: [keypair],
    encrypt,
    decrypt,
  }
}

export type KeyToolSignCallback = (
  didDocument: DidDocumentV2.DidDocument
) => CryptoCallbacksV2.SignCallback

/**
 * Generates a callback that can be used for signing.
 *
 * @param keypair The keypair to use for signing.
 * @returns The callback.
 */
export function makeSignCallback(keypair: KeyringPair): KeyToolSignCallback {
  return (didDocument) =>
    async function sign({ data, verificationMethodRelationship }) {
      const keyId = didDocument[verificationMethodRelationship]?.[0]
      if (keyId === undefined) {
        throw new Error(
          `Key for purpose "${verificationMethodRelationship}" not found in did "${didDocument.id}"`
        )
      }
      const verificationMethod = didDocument.verificationMethod.find(
        (vm) => vm.id === keyId
      )
      if (verificationMethod === undefined) {
        throw new Error(
          `Key for purpose "${verificationMethodRelationship}" not found in did "${didDocument.id}"`
        )
      }
      const signature = keypair.sign(data, { withType: false })

      return {
        signature,
        verificationMethodPublicKey: verificationMethod.publicKeyMultibase,
      }
    }
}

type StoreDidCallback = Parameters<
  typeof Did.DidChainV2.getStoreTxFromInput
>['2']

/**
 * Generates a callback that can be used for signing.
 *
 * @param keypair The keypair to use for signing.
 * @returns The callback.
 */
export function makeStoreDidCallback(
  keypair: KiltKeyringPair
): StoreDidCallback {
  return async function sign({ data }) {
    const signature = keypair.sign(data, { withType: false })
    return {
      signature,
      verificationMethodPublicKey:
        Did.DidUtilsV2.keypairToMultibaseKey(keypair),
    }
  }
}

export interface KeyTool {
  keypair: KiltKeyringPair
  getSignCallback: KeyToolSignCallback
  storeDidCallback: StoreDidCallback
  authentication: [NewLightDidVerificationKey]
}

/**
 * Generates a keypair usable for signing and a few related values.
 *
 * @param type The type to use for the keypair.
 * @returns The keypair, matching sign callback, a key usable as DID authentication key.
 */
export function makeSigningKeyTool(
  type: KiltKeyringPair['type'] = 'sr25519'
): KeyTool {
  const keypair = Crypto.makeKeypairFromSeed(undefined, type)
  const getSignCallback = makeSignCallback(keypair)
  const storeDidCallback = makeStoreDidCallback(keypair)

  return {
    keypair,
    getSignCallback,
    storeDidCallback,
    authentication: [keypair as NewLightDidVerificationKey],
  }
}

/**
 * Given a keypair, creates a light DID with an authentication and an encryption key.
 *
 * @param keypair KeyringPair instance for authentication key.
 * @returns DidDocument.
 */
export async function createMinimalLightDidFromKeypair(
  keypair: KeyringPair
): Promise<DidDocumentV2.DidDocument> {
  const type = keypair.type as LightDidSupportedVerificationKeyType
  return Did.DidDetailsV2.createLightDidDocument({
    authentication: [{ publicKey: keypair.publicKey, type }],
    keyAgreement: makeEncryptionKeyTool(`${keypair.publicKey}//enc`)
      .keyAgreement,
  })
}

// Mock function to generate a key ID without having to rely on a real chain metadata.
export function computeKeyId(key: DidKey['publicKey']): DidKey['id'] {
  return `#${blake2AsHex(key, 256)}`
}

function makeDidKeyFromKeypair({
  publicKey,
  type,
}: KiltKeyringPair): DidVerificationKey {
  return {
    id: computeKeyId(publicKey),
    publicKey,
    type,
  }
}

/**
 * Creates [[DidDocument]] for local use, e.g., in testing. Will not work on-chain because key IDs are generated ad-hoc.
 *
 * @param keypair The KeyringPair for authentication key, other keys derived from it.
 * @param generationOptions The additional options for generation.
 * @param generationOptions.keyRelationships The set of key relationships to indicate which keys must be added to the DID.
 * @param generationOptions.endpoints The set of service endpoints that must be added to the DID.
 *
 * @returns A promise resolving to a [[DidDocument]] object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoFullDidFromKeypair(
  keypair: KiltKeyringPair,
  {
    keyRelationships = new Set([
      'assertionMethod',
      'capabilityDelegation',
      'keyAgreement',
    ]),
    endpoints = [],
  }: {
    keyRelationships?: Set<Omit<KeyRelationship, 'authentication'>>
    endpoints?: DidServiceEndpoint[]
  } = {}
): Promise<DidDocument> {
  const authKey = makeDidKeyFromKeypair(keypair)
  const uri = Did.getFullDidUriFromKey(authKey)

  const result: DidDocument = {
    uri,
    authentication: [authKey],
    service: endpoints,
  }

  if (keyRelationships.has('keyAgreement')) {
    const encryptionKeypair = makeEncryptionKeyTool(`${keypair.publicKey}//enc`)
      .keyAgreement[0]
    const encKey = {
      ...encryptionKeypair,
      id: computeKeyId(encryptionKeypair.publicKey),
    }
    result.keyAgreement = [encKey]
  }
  if (keyRelationships.has('assertionMethod')) {
    const attKey = makeDidKeyFromKeypair(
      keypair.derive('//att') as KiltKeyringPair
    )
    result.assertionMethod = [attKey]
  }
  if (keyRelationships.has('capabilityDelegation')) {
    const delKey = makeDidKeyFromKeypair(
      keypair.derive('//del') as KiltKeyringPair
    )
    result.capabilityDelegation = [delKey]
  }

  return result
}

/**
 * Creates a full DID from a light DID where the verification keypair is enabled for all verification purposes (authentication, assertionMethod, capabilityDelegation).
 * This is not recommended, use for demo purposes only!
 *
 * @param lightDid The light DID whose keys will be used on the full DID.
 * @returns A full DID instance that is not yet written to the blockchain.
 */
export async function createLocalDemoFullDidFromLightDid(
  lightDid: DidDocument
): Promise<DidDocument> {
  const { uri, authentication } = lightDid

  return {
    uri: Did.getFullDidUri(uri),
    authentication,
    assertionMethod: authentication,
    capabilityDelegation: authentication,
    keyAgreement: lightDid.keyAgreement,
  }
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  payer: KiltKeyringPair,
  lightDidForId: DidDocumentV2.DidDocument,
  sign: StoreDidCallback
): Promise<DidDocumentV2.DidDocument> {
  const api = ConfigService.get('api')
  const fullDidDocumentToBeCreated = lightDidForId
  fullDidDocumentToBeCreated.assertionMethod = [
    fullDidDocumentToBeCreated.authentication[0],
  ]
  fullDidDocumentToBeCreated.capabilityDelegation = [
    fullDidDocumentToBeCreated.authentication[0],
  ]
  const tx = await Did.DidChainV2.getStoreTxFromDidDocument(
    fullDidDocumentToBeCreated,
    payer.address,
    sign
  )
  await Blockchain.signAndSubmitTx(tx, payer)
  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(
    Did.DidChainV2.toChain(Did.getFullDidUri(fullDidDocumentToBeCreated.id))
  )
  const {
    document: {
      authentication,
      uri,
      assertionMethod,
      capabilityDelegation,
      keyAgreement,
      service,
    },
  } = await Did.linkedInfoFromChain(encodedDidDetails)
  const didDocument: DidDocumentV2.DidDocument = {
    id: uri,
    authentication: [authentication[0].id],
    verificationMethod: [
      Did.DidUtilsV2.didKeyToVerificationMethod(uri, authentication[0].id, {
        keyType: authentication[0].type,
        publicKey: authentication[0].publicKey,
      }),
    ],
    service,
  }
  if (assertionMethod !== undefined) {
    const { id, publicKey, type } = assertionMethod[0]
    Did.DidDetailsV2.addKeypairAsVerificationMethod(
      didDocument,
      {
        id,
        publicKey,
        type,
      },
      'assertionMethod'
    )
  }
  if (capabilityDelegation !== undefined) {
    const { id, publicKey, type } = capabilityDelegation[0]
    Did.DidDetailsV2.addKeypairAsVerificationMethod(
      didDocument,
      {
        id,
        publicKey,
        type,
      },
      'capabilityDelegation'
    )
  }
  if (keyAgreement !== undefined && keyAgreement.length > 0) {
    keyAgreement.forEach(({ id, type, publicKey }) => {
      Did.DidDetailsV2.addKeypairAsVerificationMethod(
        didDocument,
        {
          id,
          publicKey,
          type,
        },
        'keyAgreement'
      )
    })
  }

  return didDocument
}

export async function createFullDidFromSeed(
  payer: KiltKeyringPair,
  keypair: KiltKeyringPair
): Promise<DidDocumentV2.DidDocument> {
  const lightDid = await createMinimalLightDidFromKeypair(keypair)
  const sign = makeStoreDidCallback(keypair)
  return createFullDidFromLightDid(payer, lightDid, sign)
}

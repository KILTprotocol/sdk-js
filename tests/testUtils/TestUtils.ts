/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { blake2AsHex, blake2AsU8a } from '@polkadot/util-crypto'

import type {
  DecryptCallback,
  DidDocument,
  EncryptCallback,
  KeyringPair,
  KiltEncryptionKeypair,
  KiltKeyringPair,
  SignCallback,
  UriFragment,
  VerificationMethod,
  VerificationMethodRelationship,
} from '@kiltprotocol/types'
import type {
  BaseNewDidKey,
  ChainDidKey,
  DidKeyType,
  LightDidSupportedVerificationKeyType,
  NewLightDidVerificationKey,
  NewService,
} from '@kiltprotocol/did'

import { Crypto } from '@kiltprotocol/utils'
import { Blockchain } from '@kiltprotocol/chain-helpers'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'

export type EncryptionKeyToolCallback = (
  didDocument: DidDocument
) => EncryptCallback

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
      const verificationMethod = didDocument.verificationMethod?.find(
        (v) => v.id === keyId
      ) as VerificationMethod
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
}: KiltEncryptionKeypair): DecryptCallback {
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
  decrypt: DecryptCallback
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

export type KeyToolSignCallback = (didDocument: DidDocument) => SignCallback

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
      const verificationMethod = didDocument.verificationMethod?.find(
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
        verificationMethod,
      }
    }
}

type StoreDidCallback = Parameters<typeof Did.getStoreTxFromInput>['2']

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
      verificationMethod: {
        publicKeyMultibase: Did.keypairToMultibaseKey(keypair),
      },
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

function doesVerificationMethodExist(
  didDocument: DidDocument,
  { id }: Pick<VerificationMethod, 'id'>
): boolean {
  return (
    didDocument.verificationMethod?.find((vm) => vm.id === id) !== undefined
  )
}

function addVerificationMethod(
  didDocument: DidDocument,
  verificationMethod: VerificationMethod,
  relationship: VerificationMethodRelationship
): void {
  const existingRelationship = didDocument[relationship] ?? []
  existingRelationship.push(verificationMethod.id)
  // eslint-disable-next-line no-param-reassign
  didDocument[relationship] = existingRelationship
  if (!doesVerificationMethodExist(didDocument, verificationMethod)) {
    const existingVerificationMethod = didDocument.verificationMethod ?? []
    existingVerificationMethod.push(verificationMethod)
    // eslint-disable-next-line no-param-reassign
    didDocument.verificationMethod = existingVerificationMethod
  }
}

function addKeypairAsVerificationMethod(
  didDocument: DidDocument,
  { id, publicKey, type: keyType }: BaseNewDidKey & { id: UriFragment },
  relationship: VerificationMethodRelationship
): void {
  const verificationMethod = Did.didKeyToVerificationMethod(
    didDocument.id,
    id,
    {
      keyType: keyType as DidKeyType,
      publicKey,
    }
  )
  addVerificationMethod(didDocument, verificationMethod, relationship)
}

/**
 * Given a keypair, creates a light DID with an authentication and an encryption key.
 *
 * @param keypair KeyringPair instance for authentication key.
 * @returns DidDocument.
 */
export async function createMinimalLightDidFromKeypair(
  keypair: KeyringPair
): Promise<DidDocument> {
  const type = keypair.type as LightDidSupportedVerificationKeyType
  return Did.createLightDidDocument({
    authentication: [{ publicKey: keypair.publicKey, type }],
    keyAgreement: makeEncryptionKeyTool(`${keypair.publicKey}//enc`)
      .keyAgreement,
  })
}

// Mock function to generate a key ID without having to rely on a real chain metadata.
export function computeKeyId(key: ChainDidKey['publicKey']): ChainDidKey['id'] {
  return `#${blake2AsHex(key, 256)}`
}

function makeDidKeyFromKeypair({
  publicKey,
  type,
}: KiltKeyringPair): ChainDidKey {
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
    keyRelationships?: Set<
      Omit<VerificationMethodRelationship, 'authentication'>
    >
    endpoints?: NewService[]
  } = {}
): Promise<DidDocument> {
  const {
    type: keyType,
    publicKey,
    id: authKeyId,
  } = makeDidKeyFromKeypair(keypair)
  const id = Did.getFullDidUriFromVerificationMethod({
    publicKeyMultibase: Did.keypairToMultibaseKey({
      type: keyType,
      publicKey,
    }),
  })

  const result: DidDocument = {
    id,
    authentication: [authKeyId],
    verificationMethod: [
      Did.didKeyToVerificationMethod(id, authKeyId, {
        keyType,
        publicKey,
      }),
    ],
    service: endpoints,
  }

  if (keyRelationships.has('keyAgreement')) {
    const { publicKey: encPublicKey, type } = makeEncryptionKeyTool(
      `${keypair.publicKey}//enc`
    ).keyAgreement[0]
    addKeypairAsVerificationMethod(
      result,
      {
        id: computeKeyId(encPublicKey),
        publicKey: encPublicKey,
        type,
      },
      'keyAgreement'
    )
  }
  if (keyRelationships.has('assertionMethod')) {
    const { publicKey: encPublicKey, type } = makeDidKeyFromKeypair(
      keypair.derive('//att') as KiltKeyringPair
    )
    addKeypairAsVerificationMethod(
      result,
      {
        id: computeKeyId(encPublicKey),
        publicKey: encPublicKey,
        type,
      },
      'assertionMethod'
    )
  }
  if (keyRelationships.has('capabilityDelegation')) {
    const { publicKey: encPublicKey, type } = makeDidKeyFromKeypair(
      keypair.derive('//del') as KiltKeyringPair
    )
    addKeypairAsVerificationMethod(
      result,
      {
        id: computeKeyId(encPublicKey),
        publicKey: encPublicKey,
        type,
      },
      'capabilityDelegation'
    )
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
  const { id, authentication } = lightDid

  return {
    id,
    authentication,
    assertionMethod: authentication,
    capabilityDelegation: authentication,
    keyAgreement: lightDid.keyAgreement,
  }
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  payer: KiltKeyringPair,
  lightDidForId: DidDocument,
  sign: StoreDidCallback
): Promise<DidDocument> {
  const api = ConfigService.get('api')
  const fullDidDocumentToBeCreated = lightDidForId
  fullDidDocumentToBeCreated.assertionMethod = [
    fullDidDocumentToBeCreated.authentication![0],
  ]
  fullDidDocumentToBeCreated.capabilityDelegation = [
    fullDidDocumentToBeCreated.authentication![0],
  ]
  const tx = await Did.getStoreTxFromDidDocument(
    fullDidDocumentToBeCreated,
    payer.address,
    sign
  )
  await Blockchain.signAndSubmitTx(tx, payer)
  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(
    Did.toChain(fullDidDocumentToBeCreated.id)
  )
  const { document } = await Did.linkedInfoFromChain(encodedDidDetails)
  return document
}

export async function createFullDidFromSeed(
  payer: KiltKeyringPair,
  keypair: KiltKeyringPair
): Promise<DidDocument> {
  const lightDid = await createMinimalLightDidFromKeypair(keypair)
  const sign = makeStoreDidCallback(keypair)
  return createFullDidFromLightDid(payer, lightDid, sign)
}

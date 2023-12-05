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
  DidUrl,
  EncryptCallback,
  KeyringPair,
  KiltAddress,
  KiltEncryptionKeypair,
  KiltKeyringPair,
  SignerInterface,
  SubmittableExtrinsic,
  UriFragment,
  VerificationMethod,
  VerificationRelationship,
} from '@kiltprotocol/types'
import type {
  BaseNewDidKey,
  ChainDidKey,
  DidVerificationMethodType,
  LightDidSupportedVerificationKeyType,
  NewLightDidVerificationKey,
  NewDidVerificationKey,
  NewDidEncryptionKey,
  NewService,
} from '@kiltprotocol/did'

import { Crypto, Signers, SDKErrors } from '@kiltprotocol/utils'
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
      if (!keyId) {
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

type StoreDidCallback = Parameters<typeof Did.getStoreTx>['2']

/**
 * Generates a callback that can be used for signing.
 *
 * @param keypair The keypair to use for signing.
 * @returns The callback.
 */
export async function makeStoreDidSigner(
  keypair: KiltKeyringPair
): Promise<SignerInterface<string, KiltAddress>> {
  const signers = await Signers.getSignersForKeypair({
    keypair,
    id: keypair.address,
  })
  const signer = await Signers.selectSigner(
    signers,
    Signers.select.verifiableOnChain()
  )
  if (!signer) {
    throw new SDKErrors.NoSuitableSignerError(
      `Failed to derive DID creation signer from keypair ${JSON.stringify(
        keypair
      )}`,
      {
        availableSigners: signers,
        signerRequirements: {
          algorithm: Signers.DID_PALLET_SUPPORTED_ALGORITHMS,
        },
      }
    )
  }
  return signer
}

export interface KeyTool {
  keypair: KiltKeyringPair
  getSigners: (
    doc: DidDocument
  ) => Promise<Array<SignerInterface<string, DidUrl>>>
  storeDidSigner: SignerInterface
  authentication: [NewLightDidVerificationKey]
}

/**
 * Generates a keypair usable for signing and a few related values.
 *
 * @param type The type to use for the keypair.
 * @returns The keypair, matching sign callback, a key usable as DID authentication key.
 */
export async function makeSigningKeyTool(
  type: KiltKeyringPair['type'] = 'sr25519'
): Promise<KeyTool> {
  const keypair = Crypto.makeKeypairFromSeed(undefined, type)
  const getSigners: (
    didDocument: DidDocument
  ) => Promise<Array<SignerInterface<string, DidUrl>>> = async (
    didDocument
  ) => {
    return (
      await Promise.all(
        didDocument.verificationMethod?.map(({ id }) =>
          Signers.getSignersForKeypair({
            keypair,
            id: `${didDocument.id}${id}`,
          })
        ) ?? []
      )
    ).flat()
  }

  const storeDidSigner = await makeStoreDidSigner(keypair)

  return {
    keypair,
    getSigners,
    storeDidSigner,
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
  relationship: VerificationRelationship
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
  relationship: VerificationRelationship
): void {
  const verificationMethod = Did.didKeyToVerificationMethod(
    didDocument.id,
    id,
    {
      keyType: keyType as DidVerificationMethodType,
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
 * Creates {@link DidDocument} for local use, e.g., in testing. Will not work on-chain because key IDs are generated ad-hoc.
 *
 * @param keypair The KeyringPair for authentication key, other keys derived from it.
 * @param generationOptions The additional options for generation.
 * @param generationOptions.verificationRelationships The set of verification relationships to indicate which keys must be added to the DID.
 * @param generationOptions.endpoints The set of services that must be added to the DID.
 *
 * @returns A promise resolving to a {@link DidDocument} object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoFullDidFromKeypair(
  keypair: KiltKeyringPair,
  {
    verificationRelationships = new Set([
      'assertionMethod',
      'capabilityDelegation',
      'keyAgreement',
    ]),
    endpoints = [],
  }: {
    verificationRelationships?: Set<
      Omit<VerificationRelationship, 'authentication'>
    >
    endpoints?: NewService[]
  } = {}
): Promise<DidDocument> {
  const {
    type: keyType,
    publicKey,
    id: authKeyId,
  } = makeDidKeyFromKeypair(keypair)
  const id = Did.getFullDidFromVerificationMethod({
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

  if (verificationRelationships.has('keyAgreement')) {
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
  if (verificationRelationships.has('assertionMethod')) {
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
  if (verificationRelationships.has('capabilityDelegation')) {
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

/**
 * Create a DID creation operation which would write to chain the DID Document provided as input.
 * Only the first authentication, assertion, and capability delegation verification methods are considered from the input DID Document.
 * All the input DID Document key agreement verification methods are considered.
 *
 * The resulting extrinsic can be submitted to create an on-chain DID that has the provided verification methods and services.
 *
 * A DID creation operation can contain at most 25 new services.
 * Additionally, each service must respect the following conditions:
 * - The service ID is at most 50 bytes long and is a valid URI fragment according to RFC#3986.
 * - The service has at most 1 service type, with a value that is at most 50 bytes long.
 * - The service has at most 1 URI, with a value that is at most 200 bytes long, and which is a valid URI according to RFC#3986.
 *
 * @param input The DID Document to store.
 * @param submitter The KILT address authorized to submit the creation operation.
 * @param signers An array of signer interfaces. A suitable signer will be selected if available.
 * The signer has to use the authentication public key encoded as a Kilt Address or as a hex string as its id.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function getStoreTxFromDidDocument(
  input: DidDocument,
  submitter: KiltAddress,
  signers: readonly SignerInterface[]
): Promise<SubmittableExtrinsic> {
  const {
    authentication,
    assertionMethod,
    keyAgreement,
    capabilityDelegation,
    service,
    verificationMethod,
  } = input

  const [authKey, assertKey, delKey, ...encKeys] = [
    authentication?.[0],
    assertionMethod?.[0],
    capabilityDelegation?.[0],
    ...(keyAgreement ?? []),
  ].map((keyId): BaseNewDidKey | undefined => {
    if (!keyId) {
      return undefined
    }
    const key = verificationMethod?.find((vm) => vm.id === keyId)
    if (key === undefined) {
      throw new SDKErrors.DidError(
        `A verification method with ID "${keyId}" was not found in the \`verificationMethod\` property of the provided DID Document.`
      )
    }
    const { keyType, publicKey } = Did.multibaseKeyToDidKey(
      key.publicKeyMultibase
    )
    if (
      !Did.isValidDidVerificationType(keyType) &&
      !Did.isValidEncryptionMethodType(keyType)
    ) {
      throw new SDKErrors.DidError(
        `Verification method with ID "${keyId}" has an unsupported type "${keyType}".`
      )
    }
    return {
      type: keyType,
      publicKey,
    }
  })

  if (authKey === undefined) {
    throw new SDKErrors.DidError(
      'Cannot create a DID without an authentication method.'
    )
  }

  const storeTxInput: Parameters<typeof Did.getStoreTx>[0] = {
    authentication: [authKey as NewDidVerificationKey],
    assertionMethod: assertKey
      ? [assertKey as NewDidVerificationKey]
      : undefined,
    capabilityDelegation: delKey
      ? [delKey as NewDidVerificationKey]
      : undefined,
    keyAgreement: encKeys as NewDidEncryptionKey[],
    service,
  }

  return Did.getStoreTx(storeTxInput, submitter, signers)
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  payer: KiltKeyringPair | Blockchain.TransactionSigner,
  lightDidForId: DidDocument,
  signer: StoreDidCallback
): Promise<DidDocument> {
  const api = ConfigService.get('api')
  const fullDidDocumentToBeCreated = lightDidForId
  fullDidDocumentToBeCreated.assertionMethod = [
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fullDidDocumentToBeCreated.authentication![0],
  ]
  fullDidDocumentToBeCreated.capabilityDelegation = [
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fullDidDocumentToBeCreated.authentication![0],
  ]
  const tx = await getStoreTxFromDidDocument(
    fullDidDocumentToBeCreated,
    'address' in payer ? payer.address : payer.id,
    signer
  )
  await Blockchain.signAndSubmitTx(tx, payer)
  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(
    Did.toChain(fullDidDocumentToBeCreated.id)
  )
  const { document } = Did.linkedInfoFromChain(encodedDidDetails)
  return document
}

export async function createFullDidFromSeed(
  payer: KiltKeyringPair,
  keypair: KiltKeyringPair
): Promise<DidDocument> {
  const lightDid = await createMinimalLightDidFromKeypair(keypair)
  const signer = await makeStoreDidSigner(keypair)
  return createFullDidFromLightDid(payer, lightDid, [signer])
}

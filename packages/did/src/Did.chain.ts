/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId32, Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import type {
  DidDidDetails,
  DidDidDetailsDidAuthorizedCallOperation,
  DidDidDetailsDidPublicKeyDetails,
  DidServiceEndpointsDidEndpoint,
  KiltSupportDeposit,
} from '@kiltprotocol/augment-api'
import type {
  BN,
  Deposit,
  DidDocument,
  DidUri,
  KiltAddress,
  Service,
  SignatureVerificationRelationship,
  SignExtrinsicCallback,
  SignRequestData,
  SignResponseData,
  SubmittableExtrinsic,
  UriFragment,
  VerificationMethod,
} from '@kiltprotocol/types'

import { ConfigService } from '@kiltprotocol/config'
import { Crypto, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import type {
  DidEncryptionMethodType,
  NewService,
  DidSigningMethodType,
  NewDidVerificationKey,
  NewDidEncryptionKey,
} from './DidDetails/DidDetails.js'

import {
  isValidVerificationMethodType,
  isValidEncryptionMethodType,
} from './DidDetails/DidDetails.js'
import {
  multibaseKeyToDidKey,
  keypairToMultibaseKey,
  getAddressFromVerificationMethod,
  getFullDidUri,
  parse,
} from './Did.utils.js'

export type ChainDidIdentifier = KiltAddress

export type EncodedVerificationKey =
  | { sr25519: Uint8Array }
  | { ed25519: Uint8Array }
  | { ecdsa: Uint8Array }
export type EncodedEncryptionKey = { x25519: Uint8Array }
export type EncodedDidKey = EncodedVerificationKey | EncodedEncryptionKey
export type EncodedSignature = EncodedVerificationKey

/**
 * Format a DID to be used as a parameter for the blockchain API functions.

 * @param did The DID to format.
 * @returns The blockchain-formatted DID.
 */
export function toChain(did: DidUri): ChainDidIdentifier {
  return parse(did).address
}

/**
 * Format a DID fragment to be used as a parameter for the blockchain API functions.

 * @param id The DID fragment to format.
 * @returns The blockchain-formatted ID.
 */
export function fragmentIdToChain(id: UriFragment): string {
  return id.replace(/^#/, '')
}

/**
 * Convert the DID data from blockchain format to the DID URI.
 *
 * @param encoded The chain-formatted DID.
 * @returns The DID URI.
 */
export function fromChain(encoded: AccountId32): DidUri {
  return getFullDidUri(Crypto.encodeAddress(encoded, ss58Format))
}

/**
 * Convert the deposit data coming from the blockchain to JS object.
 *
 * @param deposit The blockchain-formatted deposit data.
 * @returns The deposit data.
 */
export function depositFromChain(deposit: KiltSupportDeposit): Deposit {
  return {
    owner: Crypto.encodeAddress(deposit.owner, ss58Format),
    amount: deposit.amount.toBn(),
  }
}

export type ChainDidBaseKey = {
  id: UriFragment
  publicKey: Uint8Array
  includedAt?: BN
  type: string
}
export type ChainDidVerificationKey = ChainDidBaseKey & {
  type: DidSigningMethodType
}
export type ChainDidEncryptionKey = ChainDidBaseKey & {
  type: DidEncryptionMethodType
}
export type ChainDidKey = ChainDidVerificationKey | ChainDidEncryptionKey
export type ChainDidService = {
  id: string
  serviceTypes: string[]
  urls: string[]
}
export type ChainDidDetails = {
  authentication: [ChainDidVerificationKey]
  assertionMethod?: [ChainDidVerificationKey]
  capabilityDelegation?: [ChainDidVerificationKey]
  keyAgreement?: ChainDidEncryptionKey[]

  service?: ChainDidService[]

  lastTxCounter: BN
  deposit: Deposit
}

/**
 * Convert a DID public key from the blockchain format to a JS object.
 *
 * @param keyId The key ID.
 * @param keyDetails The associated public key blockchain-formatted details.
 * @returns The JS-formatted DID key.
 */
export function publicKeyFromChain(
  keyId: Hash,
  keyDetails: DidDidDetailsDidPublicKeyDetails
): ChainDidKey {
  const key = keyDetails.key.isPublicEncryptionKey
    ? keyDetails.key.asPublicEncryptionKey
    : keyDetails.key.asPublicVerificationKey
  return {
    id: `#${keyId.toHex()}`,
    publicKey: key.value.toU8a(),
    type: key.type.toLowerCase() as ChainDidKey['type'],
  }
}

/**
 * Convert the DID Document data from the blockchain format to a JS object.
 *
 * @param encoded The chain-formatted DID Document.
 * @returns The DID Document.
 */
export function documentFromChain(
  encoded: Option<DidDidDetails>
): ChainDidDetails {
  const {
    publicKeys,
    authenticationKey,
    attestationKey,
    delegationKey,
    keyAgreementKeys,
    lastTxCounter,
    deposit,
  } = encoded.unwrap()

  const keys: Record<string, ChainDidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) => publicKeyFromChain(keyId, keyDetails))
    .reduce((res, key) => {
      res[fragmentIdToChain(key.id)] = key
      return res
    }, {})

  const authentication = keys[
    authenticationKey.toHex()
  ] as ChainDidVerificationKey

  const didRecord: ChainDidDetails = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn(),
    deposit: depositFromChain(deposit),
  }
  if (attestationKey.isSome) {
    const key = keys[attestationKey.unwrap().toHex()] as ChainDidVerificationKey
    didRecord.assertionMethod = [key]
  }
  if (delegationKey.isSome) {
    const key = keys[delegationKey.unwrap().toHex()] as ChainDidVerificationKey
    didRecord.capabilityDelegation = [key]
  }

  const keyAgreementKeyIds = [...keyAgreementKeys.values()].map((keyId) =>
    keyId.toHex()
  )
  if (keyAgreementKeyIds.length > 0) {
    didRecord.keyAgreement = keyAgreementKeyIds.map(
      (id) => keys[id] as ChainDidEncryptionKey
    )
  }

  return didRecord
}

function isUri(str: string): boolean {
  try {
    const url = new URL(str) // this actually accepts any URI but throws if it can't be parsed
    return url.href === str || encodeURI(decodeURI(str)) === str // make sure our URI has not been converted implicitly by URL
  } catch {
    return false
  }
}

const uriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/

/**
 * Checks if a string is a valid URI fragment according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI fragment.
 */
function isUriFragment(str: string): boolean {
  try {
    return uriFragmentRegex.test(str) && !!decodeURIComponent(str)
  } catch {
    return false
  }
}

/**
 * Performs sanity checks on service data, making sure that the following conditions are met:
 *   - The `id` property is a string containing a valid URI fragment according to RFC#3986, not a complete DID URI.
 *   - If the `uris` property contains one or more strings, they must be valid URIs according to RFC#3986.
 *
 * @param endpoint A service object to check.
 */
export function validateNewService(endpoint: NewService): void {
  const { id, serviceEndpoint } = endpoint
  if ((id as string).startsWith('did:kilt')) {
    throw new SDKErrors.DidError(
      `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URL, which is violated by id "${id}"`
    )
  }
  if (!isUriFragment(fragmentIdToChain(id))) {
    throw new SDKErrors.DidError(
      `The service ID must be valid as a URI fragment according to RFC#3986, which "${id}" is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding the desired id.`
    )
  }
  serviceEndpoint.forEach((uri) => {
    if (!isUri(uri)) {
      throw new SDKErrors.DidError(
        `A service URI must be a URI according to RFC#3986, which "${uri}" (service id "${id}") is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding resource locators beforehand.`
      )
    }
  })
}

/**
 * Format the DID service to be used as a parameter for the blockchain API functions.
 *
 * @param service The DID service to format.
 * @returns The blockchain-formatted DID service.
 */
export function serviceToChain(service: NewService): ChainDidService {
  validateNewService(service)
  const { id, type, serviceEndpoint } = service
  return {
    id: fragmentIdToChain(id),
    serviceTypes: type,
    urls: serviceEndpoint,
  }
}

/**
 * Convert the DID service data coming from the blockchain to JS object.
 *
 * @param encoded The blockchain-formatted DID service data.
 * @returns The DID service.
 */
export function serviceFromChain(
  encoded: Option<DidServiceEndpointsDidEndpoint>
): Service {
  const { id, serviceTypes, urls } = encoded.unwrap()
  return {
    id: `#${id.toUtf8()}`,
    type: serviceTypes.map((type) => type.toUtf8()),
    serviceEndpoint: urls.map((url) => url.toUtf8()),
  }
}

export type AuthorizeCallInput = {
  did: DidUri
  txCounter: AnyNumber
  call: Extrinsic
  submitter: KiltAddress
  blockNumber?: AnyNumber
}

export function publicKeyToChain(
  key: NewDidVerificationKey
): EncodedVerificationKey
export function publicKeyToChain(key: NewDidEncryptionKey): EncodedEncryptionKey

/**
 * Transforms a DID public key record to an enum-type key-value pair required in many key-related extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function publicKeyToChain(
  key: NewDidVerificationKey | NewDidEncryptionKey
): EncodedDidKey {
  // TypeScript can't infer type here, so we have to add a type assertion.
  return { [key.type]: key.publicKey } as EncodedDidKey
}

interface GetStoreTxInput {
  authentication: [NewDidVerificationKey]
  assertionMethod?: [NewDidVerificationKey]
  capabilityDelegation?: [NewDidVerificationKey]
  keyAgreement?: NewDidEncryptionKey[]

  service?: NewService[]
}

type GetStoreTxSignCallbackResponse = Pick<SignResponseData, 'signature'> & {
  // We don't need the key ID to dispatch the tx.
  verificationMethod: Pick<VerificationMethod, 'publicKeyMultibase'>
}
export type GetStoreTxSignCallback = (
  signData: Omit<SignRequestData, 'did'>
) => Promise<GetStoreTxSignCallbackResponse>

/**
 * Create a DID creation operation which includes the information provided.
 *
 * The resulting extrinsic can be submitted to create an on-chain DID that has the provided keys as verification methods and services.
 *
 * A DID creation operation can contain at most 25 new services.
 * Additionally, each service must respect the following conditions:
 * - The service ID is at most 50 bytes long and is a valid URI fragment according to RFC#3986.
 * - The service has at most 1 service type, with a value that is at most 50 bytes long.
 * - The service has at most 1 URI, with a value that is at most 200 bytes long, and which is a valid URI according to RFC#3986.
 *
 * @param input The DID keys and services to store.
 * @param submitter The KILT address authorized to submit the creation operation.
 * @param sign The sign callback. The authentication key has to be used.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function getStoreTxFromInput(
  input: GetStoreTxInput,
  submitter: KiltAddress,
  sign: GetStoreTxSignCallback
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')

  const {
    authentication,
    assertionMethod,
    capabilityDelegation,
    keyAgreement = [],
    service = [],
  } = input

  if (!('authentication' in input) || typeof authentication[0] !== 'object') {
    throw new SDKErrors.DidError(
      `The provided DID does not have an authentication key to sign the creation operation`
    )
  }

  // For now, it only takes the first attestation key, if present.
  if (assertionMethod && assertionMethod.length > 1) {
    throw new SDKErrors.DidError(
      `More than one attestation key (${assertionMethod.length}) specified. The chain can only store one.`
    )
  }

  // For now, it only takes the first delegation key, if present.
  if (capabilityDelegation && capabilityDelegation.length > 1) {
    throw new SDKErrors.DidError(
      `More than one delegation key (${capabilityDelegation.length}) specified. The chain can only store one.`
    )
  }

  const maxKeyAgreementKeys = api.consts.did.maxNewKeyAgreementKeys.toNumber()
  if (keyAgreement.length > maxKeyAgreementKeys) {
    throw new SDKErrors.DidError(
      `The number of key agreement keys in the creation operation is greater than the maximum allowed, which is ${maxKeyAgreementKeys}`
    )
  }

  const maxNumberOfServicesPerDid =
    api.consts.did.maxNumberOfServicesPerDid.toNumber()
  if (service.length > maxNumberOfServicesPerDid) {
    throw new SDKErrors.DidError(
      `Cannot store more than ${maxNumberOfServicesPerDid} services per DID`
    )
  }

  const [authenticationKey] = authentication
  const did = getAddressFromVerificationMethod({
    publicKeyMultibase: keypairToMultibaseKey(authenticationKey),
  })

  const newAttestationKey =
    assertionMethod &&
    assertionMethod.length > 0 &&
    publicKeyToChain(assertionMethod[0])

  const newDelegationKey =
    capabilityDelegation &&
    capabilityDelegation.length > 0 &&
    publicKeyToChain(capabilityDelegation[0])

  const newKeyAgreementKeys = keyAgreement.map(publicKeyToChain)
  const newServiceDetails = service.map(serviceToChain)

  const apiInput = {
    did,
    submitter,
    newAttestationKey,
    newDelegationKey,
    newKeyAgreementKeys,
    newServiceDetails,
  }

  const encoded = api.registry
    .createType(api.tx.did.create.meta.args[0].type.toString(), apiInput)
    .toU8a()

  const { signature } = await sign({
    data: encoded,
    verificationRelationship: 'authentication',
  })
  const encodedSignature = {
    [authenticationKey.type]: signature,
  } as EncodedSignature
  return api.tx.did.create(encoded, encodedSignature)
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
 * @param sign The sign callback. The authentication key has to be used.
 *
 * @returns The SubmittableExtrinsic for the DID creation operation.
 */
export async function getStoreTxFromDidDocument(
  input: DidDocument,
  submitter: KiltAddress,
  sign: GetStoreTxSignCallback
): Promise<SubmittableExtrinsic> {
  const {
    authentication,
    assertionMethod,
    keyAgreement,
    capabilityDelegation,
    service,
    verificationMethod,
  } = input

  const authKey = (() => {
    const authenticationMethodId = authentication?.[0]
    if (authenticationMethodId === undefined) {
      throw new SDKErrors.DidError(
        'Cannot create a DID without an authentication method.'
      )
    }
    const authVerificationMethod = verificationMethod?.find(
      (vm) => vm.id === authenticationMethodId
    )
    if (authVerificationMethod === undefined) {
      throw new SDKErrors.DidError(
        `Cannot find the authentication method with ID "${authenticationMethodId}" in the \`verificationMethod\` property.`
      )
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      authVerificationMethod.publicKeyMultibase
    )
    if (!isValidVerificationMethodType(keyType)) {
      throw new SDKErrors.DidError(
        `Provided authentication key has an unsupported key type "${keyType}".`
      )
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidVerificationKey
  })()

  const keyAgreementKeys = (() => {
    if (keyAgreement === undefined || keyAgreement.length === 0) {
      return undefined
    }
    return keyAgreement.map((k) => {
      const vm = verificationMethod?.find((_vm) => _vm.id === k)
      if (vm === undefined) {
        throw new SDKErrors.DidError(
          `Cannot find the key agreement method with ID "${k}" in the \`verificationMethod\` property.`
        )
      }
      const { keyType, publicKey } = multibaseKeyToDidKey(vm.publicKeyMultibase)
      if (!isValidEncryptionMethodType(keyType)) {
        throw new SDKErrors.DidError(
          `The key agreement key with ID "${k}" has an unsupported key type ${keyType}.`
        )
      }
      return {
        type: keyType,
        publicKey,
      } as NewDidEncryptionKey
    })
  })()

  const assertionMethodKey = (() => {
    const assertionMethodId = assertionMethod?.[0]
    if (assertionMethodId === undefined) {
      return undefined
    }
    const assertionVerificationMethod = verificationMethod?.find(
      (vm) => vm.id === assertionMethodId
    )
    if (assertionVerificationMethod === undefined) {
      throw new SDKErrors.DidError(
        `Cannot find the assertion method with ID "${assertionMethodId}" in the \`verificationMethod\` property.`
      )
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      assertionVerificationMethod.publicKeyMultibase
    )
    if (!isValidVerificationMethodType(keyType)) {
      throw new SDKErrors.DidError(
        `The assertion method key with ID "${assertionMethodId}" has an unsupported key type ${keyType}.`
      )
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidVerificationKey
  })()

  const capabilityDelegationKey = (() => {
    const capabilityDelegationId = capabilityDelegation?.[0]
    if (capabilityDelegationId === undefined) {
      return undefined
    }
    const capabilityDelegationVerificationMethod = verificationMethod?.find(
      (vm) => vm.id === capabilityDelegationId
    )
    if (capabilityDelegationVerificationMethod === undefined) {
      throw new SDKErrors.DidError(
        `Cannot find the capability delegation method with ID "${capabilityDelegationId}" in the \`verificationMethod\` property.`
      )
    }
    const { keyType, publicKey } = multibaseKeyToDidKey(
      capabilityDelegationVerificationMethod.publicKeyMultibase
    )
    if (!isValidVerificationMethodType(keyType)) {
      throw new SDKErrors.DidError(
        `The capability delegation method key with ID "${capabilityDelegationId}" has an unsupported key type ${keyType}.`
      )
    }
    return {
      type: keyType,
      publicKey,
    } as NewDidVerificationKey
  })()

  const storeTxInput: GetStoreTxInput = {
    authentication: [authKey],
    assertionMethod: assertionMethodKey ? [assertionMethodKey] : undefined,
    capabilityDelegation: capabilityDelegationKey
      ? [capabilityDelegationKey]
      : undefined,
    keyAgreement: keyAgreementKeys,
    service,
  }

  return getStoreTxFromInput(storeTxInput, submitter, sign)
}

export interface SigningOptions {
  sign: SignExtrinsicCallback
  verificationRelationship: SignatureVerificationRelationship
}

/**
 * DID related operations on the KILT blockchain require authorization by a full DID. This is realized by requiring that relevant extrinsics are signed with a key featured by a full DID as a verification method.
 * Such extrinsics can be produced using this function.
 *
 * @param params Object wrapping all input to the function.
 * @param params.did Full DID.
 * @param params.verificationRelationship DID verification relationship to be used for authorization.
 * @param params.sign The callback to interface with the key store managing the private key to be used.
 * @param params.call The call or extrinsic to be authorized.
 * @param params.txCounter The nonce or txCounter value for this extrinsic, which must be on larger than the current txCounter value of the authorizing full DID.
 * @param params.submitter Payment account allowed to submit this extrinsic and cover its fees, which will end up owning any deposit associated with newly created records.
 * @param params.blockNumber Block number for determining the validity period of this authorization. If omitted, the current block number will be fetched from chain.
 * @returns A DID authorized extrinsic that, after signing with the payment account mentioned in the params, is ready for submission.
 */
export async function generateDidAuthenticatedTx({
  did,
  verificationRelationship,
  sign,
  call,
  txCounter,
  submitter,
  blockNumber,
}: AuthorizeCallInput & SigningOptions): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  const signableCall =
    api.registry.createType<DidDidDetailsDidAuthorizedCallOperation>(
      api.tx.did.submitDidCall.meta.args[0].type.toString(),
      {
        txCounter,
        did: toChain(did),
        call,
        submitter,
        blockNumber: blockNumber ?? (await api.query.system.number()),
      }
    )
  const { signature, verificationMethod } = await sign({
    data: signableCall.toU8a(),
    verificationRelationship,
    did,
  })
  const { keyType } = multibaseKeyToDidKey(
    verificationMethod.publicKeyMultibase
  )
  const encodedSignature = {
    [keyType]: signature,
  } as EncodedSignature
  return api.tx.did.submitDidCall(signableCall, encodedSignature)
}

/**
 * Compiles an enum-type key-value pair representation of a signature created with a full DID verification method. Required for creating full DID signed extrinsics.
 *
 * @param key Object describing data associated with a public key.
 * @param key.publicKeyMultibase The multibase, multicodec representation of the signing public key.
 * @param signature The signature generated with the full DID associated public key.
 * @returns Data restructured to allow SCALE encoding by polkadot api.
 */
export function didSignatureToChain(
  { publicKeyMultibase }: VerificationMethod,
  signature: Uint8Array
): EncodedSignature {
  const { keyType } = multibaseKeyToDidKey(publicKeyMultibase)
  if (!isValidVerificationMethodType(keyType)) {
    throw new SDKErrors.DidError(
      `encodedDidSignature requires a verification key. A key of type "${keyType}" was used instead`
    )
  }

  return { [keyType]: signature } as EncodedSignature
}

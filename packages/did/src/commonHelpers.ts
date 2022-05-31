/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Submodule to avoid circular dependencies. Re-exported under utils namespace.
 */

import {
  DidKey,
  DidServiceEndpoint,
  EncryptionAlgorithms,
  EncryptionKeyType,
  NewDidKey,
  SigningAlgorithms,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { ApiPromise } from '@polkadot/api'
import { u32 } from '@polkadot/types'
import { stringToU8a } from '@polkadot/util'

const signatureAlgForKeyType: Record<VerificationKeyType, SigningAlgorithms> = {
  [VerificationKeyType.Ed25519]: SigningAlgorithms.Ed25519,
  [VerificationKeyType.Sr25519]: SigningAlgorithms.Sr25519,
  [VerificationKeyType.Ecdsa]: SigningAlgorithms.EcdsaSecp256k1,
}

/**
 * Given the identifier of a key type, returns the identifier of the signature algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Signing algorithm identifier.
 */
export function getSigningAlgorithmForVerificationKeyType(
  keyType: VerificationKeyType
): SigningAlgorithms {
  return signatureAlgForKeyType[keyType]
}
const keyTypeForSignatureAlg = Object.entries(signatureAlgForKeyType).reduce(
  (obj, [key, value]) => {
    return { ...obj, [value]: key }
  },
  {}
) as Record<SigningAlgorithms, VerificationKeyType>

/**
 * Given the identifier of a signature algorithm, returns the identifier of the key type required for it.
 *
 * @param signatureAlg Signature algorithm identifier.
 * @returns Key type identifier.
 */
export function getVerificationKeyTypeForSigningAlgorithm(
  signatureAlg: SigningAlgorithms
): VerificationKeyType {
  return keyTypeForSignatureAlg[signatureAlg]
}

const encryptionAlgForKeyType: Record<EncryptionKeyType, EncryptionAlgorithms> =
  {
    [EncryptionKeyType.X25519]: EncryptionAlgorithms.NaclBox,
  }

/**
 * Given the identifier of a key type, returns the identifier of the encryption algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Encryption algorithm indentifier.
 */
export function getEncryptionAlgorithmForEncryptionKeyType(
  keyType: EncryptionKeyType
): EncryptionAlgorithms {
  return encryptionAlgForKeyType[keyType]
}

const keyTypeForEncryptionAlg: Record<EncryptionAlgorithms, EncryptionKeyType> =
  {
    [EncryptionAlgorithms.NaclBox]: EncryptionKeyType.X25519,
  }

/**
 * Given the identifier of an encryption algorithm, returns the identifier of the key type required for it.
 *
 * @param encryptionAlg Encryption algorithm identifier.
 * @returns Key type identifier.
 */
export function getEncryptionKeyTypeForEncryptionAlgorithm(
  encryptionAlg: EncryptionAlgorithms
): EncryptionKeyType {
  return keyTypeForEncryptionAlg[encryptionAlg]
}

/**
 * Checks whether a DidKey is a verification key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is a verification key, false otherwise.
 */
export function isVerificationKey(key: NewDidKey | DidKey): boolean {
  return Object.values(VerificationKeyType).some((kt) => kt === key.type)
}

/**
 * Checks whether a DidKey is an encryption key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is a encryption key, false otherwise.
 */
export function isEncryptionKey(key: NewDidKey | DidKey): boolean {
  return Object.values(EncryptionKeyType).some((kt) => kt === key.type)
}

/**
 * Checks if a string is a valid URI according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI.
 */
export function isUri(str: string): boolean {
  try {
    const url = new URL(str) // this actually accepts any URI but throws if it can't be parsed
    return url.href === str || encodeURI(decodeURI(str)) === str // make sure our URI has not been converted implictly by URL
  } catch {
    return false
  }
}

const UriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/

/**
 * Checks if a string is a valid URI fragment according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI fragment.
 */
export function isUriFragment(str: string): boolean {
  try {
    return UriFragmentRegex.test(str) && !!decodeURIComponent(str)
  } catch {
    return false
  }
}

/**
 * Performs sanity checks on service endpoint data, making sure that the following conditions are met:
 *   - The the `id` property is string containing a valid URI fragment according to RFC#3986, not a complete DID URI.
 *   - The if the `urls` property contains one or more strings, they must be valid URIs according to RFC#3986.
 *
 * @param endpoint A service endpoint object to check.
 * @returns Validation result and errors, if any.
 */
export function checkServiceEndpointSyntax(
  endpoint: DidServiceEndpoint
): [boolean, Error[] | undefined] {
  const errors: Error[] = []
  if (endpoint.id.startsWith('did:kilt')) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id '${endpoint.id}'`
      )
    )
  }
  if (!isUriFragment(endpoint.id)) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service ID must be valid as a URI fragment according to RFC#3986, which '${endpoint.id}' is not. Make sure not to use disallowed characters (e.g. blankspace) or consider URL-encoding the desired id.`
      )
    )
  }
  endpoint.urls.forEach((url) => {
    if (!isUri(url)) {
      errors.push(
        new SDKErrors.ERROR_DID_ERROR(
          `A service URL must be a URI according to RFC#3986, which '${url}' (service id '${endpoint.id}') is not. Make sure not to use disallowed characters (e.g. blankspace) or consider URL-encoding resource locators beforehand.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

/**
 * Performs size checks on service endpoint data, making sure that the following conditions are met:
 *   - The `endpoint.id` is at most 50 ASCII characters long.
 *   - The `endpoint.types` array has at most 1 service type, with a value that is at most 50 ASCII characters long.
 *   - The `endpoint.urls` array has at most 1 URL, with a value that is at most 200 ASCII characters long.
 *
 * @param api An api instance required for reading up-to-date size contraints from the blockchain runtime.
 * @param endpoint A service endpoint object to check.
 * @returns Validation result and errors, if any.
 */
export function checkServiceEndpointSizeConstraints(
  api: ApiPromise,
  endpoint: DidServiceEndpoint
): [boolean, Error[] | undefined] {
  const [
    maxServiceIdLength,
    maxNumberOfTypesPerService,
    maxNumberOfUrlsPerService,
    maxServiceTypeLength,
    maxServiceUrlLength,
  ] = [
    (api.consts.did.maxServiceIdLength as u32).toNumber(),
    (api.consts.did.maxNumberOfTypesPerService as u32).toNumber(),
    (api.consts.did.maxNumberOfUrlsPerService as u32).toNumber(),
    (api.consts.did.maxServiceTypeLength as u32).toNumber(),
    (api.consts.did.maxServiceUrlLength as u32).toNumber(),
  ]
  const errors: Error[] = []

  const idEncodedLength = stringToU8a(endpoint.id).length
  if (idEncodedLength > maxServiceIdLength) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service ID '${endpoint.id}' is too long (${idEncodedLength} bytes). Max number of bytes allowed for a service ID is ${maxServiceIdLength}.`
      )
    )
  }
  if (endpoint.types.length > maxNumberOfTypesPerService) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service with ID '${endpoint.id}' has too many types (${endpoint.types.length}). Max number of types allowed per service is ${maxNumberOfTypesPerService}.`
      )
    )
  }
  if (endpoint.urls.length > maxNumberOfUrlsPerService) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service with ID '${endpoint.id}' has too many URLs (${endpoint.urls.length}). Max number of URLs allowed per service is ${maxNumberOfUrlsPerService}.`
      )
    )
  }
  endpoint.types.forEach((type) => {
    const typeEncodedLength = stringToU8a(type).length
    if (typeEncodedLength > maxServiceTypeLength) {
      errors.push(
        new SDKErrors.ERROR_DID_ERROR(
          `The service with ID '${endpoint.id}' has the type '${type}' that is too long (${typeEncodedLength} bytes). Max number of bytes allowed for a service type is ${maxServiceTypeLength}.`
        )
      )
    }
  })
  endpoint.urls.forEach((url) => {
    const urlEncodedLength = stringToU8a(url).length
    if (urlEncodedLength > maxServiceUrlLength) {
      errors.push(
        new SDKErrors.ERROR_DID_ERROR(
          `The service with ID '${endpoint.id}' has the URL '${url}' that is too long (${urlEncodedLength} bytes). Max number of bytes allowed for a service URL is ${maxServiceUrlLength}.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

/**
 * Copyright 2018-2021 BOTLabs GmbH.
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
export function getSigningAlgorithmForVerificationKeyType(
  keyType: VerificationKeyType
): SigningAlgorithms {
  return signatureAlgForKeyType[keyType]
}
const keyTypeForSignatureAlg: Record<SigningAlgorithms, VerificationKeyType> = {
  [SigningAlgorithms.Ed25519]: VerificationKeyType.Ed25519,
  [SigningAlgorithms.Sr25519]: VerificationKeyType.Sr25519,
  [SigningAlgorithms.EcdsaSecp256k1]: VerificationKeyType.Ecdsa,
}
export function getVerificationKeyTypeForSigningAlgorithm(
  signatureAlg: SigningAlgorithms
): VerificationKeyType {
  return keyTypeForSignatureAlg[signatureAlg]
}

const encryptionAlgForKeyType: Record<EncryptionKeyType, EncryptionAlgorithms> =
  {
    [EncryptionKeyType.X25519]: EncryptionAlgorithms.NaclBox,
  }
export function getEncryptionAlgorithmForEncryptionKeyType(
  keyType: EncryptionKeyType
): EncryptionAlgorithms {
  return encryptionAlgForKeyType[keyType]
}
const keyTypeForEncryptionAlg: Record<EncryptionAlgorithms, EncryptionKeyType> =
  {
    [EncryptionAlgorithms.NaclBox]: EncryptionKeyType.X25519,
  }
export function getEncryptionKeyTypeForEncryptionAlgorithm(
  encryptionAlg: EncryptionAlgorithms
): EncryptionKeyType {
  return keyTypeForEncryptionAlg[encryptionAlg]
}

export function isVerificationKey(key: NewDidKey | DidKey): boolean {
  return Object.values(VerificationKeyType).some((kt) => kt === key.type)
}

export function isEncryptionKey(key: NewDidKey | DidKey): boolean {
  return Object.values(EncryptionKeyType).some((kt) => kt === key.type)
}

export function isUri(s: string): boolean {
  try {
    const url = new URL(s) // this actually accepts any URI but throws if it can't be parsed
    return url.href === s || encodeURI(decodeURI(s)) === s // make sure our URI has not been converted implictly by URL
  } catch {
    return false
  }
}

const UriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/
export function isUriFragment(s: string): boolean {
  try {
    return UriFragmentRegex.test(s) && !!decodeURIComponent(s)
  } catch {
    return false
  }
}

export function checkServiceEndpointSyntax(
  endpoint: DidServiceEndpoint
): [boolean, Error[] | undefined] {
  const errors: Error[] = []
  if (endpoint.id.startsWith('did:kilt')) {
    errors.push(
      SDKErrors.ERROR_DID_ERROR(
        `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id '${endpoint.id}'`
      )
    )
  }
  if (!isUriFragment(endpoint.id)) {
    errors.push(
      SDKErrors.ERROR_DID_ERROR(
        `The service ID must be valid as a URI fragment according to RFC#3986, which '${endpoint.id}' is not. Make sure not to use disallowed characters (e.g. blankspace) or consider URL-encoding the desired id.`
      )
    )
  }
  endpoint.urls.forEach((url) => {
    if (!isUri(url)) {
      errors.push(
        SDKErrors.ERROR_DID_ERROR(
          `A service URL must be a URI according to RFC#3986, which '${url}' (service id '${endpoint.id}') is not. Make sure not to use disallowed characters (e.g. blankspace) or consider URL-encoding resource locators beforehand.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

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
      SDKErrors.ERROR_DID_ERROR(
        `The service ID '${endpoint.id}' is too long (${idEncodedLength} bytes). Max number of bytes allowed for a service ID is ${maxServiceIdLength}.`
      )
    )
  }
  if (endpoint.types.length > maxNumberOfTypesPerService) {
    errors.push(
      SDKErrors.ERROR_DID_ERROR(
        `The service with ID '${endpoint.id}' has too many types (${endpoint.types.length}). Max number of types allowed per service is ${maxNumberOfTypesPerService}.`
      )
    )
  }
  if (endpoint.urls.length > maxNumberOfUrlsPerService) {
    errors.push(
      SDKErrors.ERROR_DID_ERROR(
        `The service with ID '${endpoint.id}' has too many URLs (${endpoint.urls.length}). Max number of URLs allowed per service is ${maxNumberOfUrlsPerService}.`
      )
    )
  }
  endpoint.types.forEach((type) => {
    const typeEncodedLength = stringToU8a(type).length
    if (typeEncodedLength > maxServiceTypeLength) {
      errors.push(
        SDKErrors.ERROR_DID_ERROR(
          `The service with ID '${endpoint.id}' has the type '${type}' that is too long (${typeEncodedLength} bytes). Max number of bytes allowed for a service type is ${maxServiceTypeLength}.`
        )
      )
    }
  })
  endpoint.urls.forEach((url) => {
    const urlEncodedLength = stringToU8a(url).length
    if (urlEncodedLength > maxServiceUrlLength) {
      errors.push(
        SDKErrors.ERROR_DID_ERROR(
          `The service with ID '${endpoint.id}' has the URL '${url}' that is too long (${urlEncodedLength} bytes). Max number of bytes allowed for a service URL is ${maxServiceUrlLength}.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

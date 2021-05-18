import { SDKErrors } from '@kiltprotocol/utils'
import type { Codec, Registry } from '@polkadot/types/types'
import type {
  DidSigned,
  PublicKeyEnum,
  ISigningKeyPair,
  UrlEnum,
  IPublicKey,
  UrlEncoding,
  IDeleteOptions,
  IUpdateOptions,
  ICreateOptions,
  IAuthorizeCallOptions,
} from './types'
import type {
  DidAuthorizedCallOperation,
  DidCreationOperation,
  DidDeletionOperation,
  DidUpdateOperation,
} from './types.chain'

export const KILT_DID_PREFIX = 'did:kilt:'

export function getDidFromIdentifier(identifier: string): string {
  return KILT_DID_PREFIX + identifier
}

export function getIdentifierFromDid(did: string): string {
  if (!did.startsWith(KILT_DID_PREFIX)) {
    throw SDKErrors.ERROR_INVALID_DID_PREFIX(did)
  }
  return did.substr(KILT_DID_PREFIX.length)
}

export function signCodec<PayloadType extends Codec>(
  payload: PayloadType,
  signer: ISigningKeyPair
): DidSigned<PayloadType> {
  const signature = {
    [signer.type]: signer.sign(payload.toU8a()),
  }
  return { payload, signature }
}

export function formatPublicKey(keypair: IPublicKey): PublicKeyEnum {
  const { type, publicKey } = keypair
  return { [type]: publicKey }
}

export function isIKeyPair(keypair: unknown): keypair is IPublicKey {
  if (typeof keypair === 'object') {
    const { publicKey, type } = keypair as any
    return publicKey instanceof Uint8Array && typeof type === 'string'
  }
  return false
}

export function encodeEndpointUrl(url: string): UrlEnum {
  const typedUrl: Record<string, UrlEncoding> = {}
  const matched = Array.from(['http', 'ftp', 'ipfs']).some((type) => {
    if (url.startsWith(type)) {
      typedUrl[type] = { payload: url }
      return true
    }
    return false
  })
  if (!matched)
    throw new Error(
      'only endpoint urls starting with http/https, ftp, and ipfs are accepted'
    )
  return typedUrl as UrlEnum
}

export function encodeDidCreate(
  registry: Registry,
  { didIdentifier, keys, endpointUrl }: ICreateOptions
): DidCreationOperation {
  // build did create object
  const didCreateRaw = {
    did: didIdentifier,
    newAuthenticationKey: formatPublicKey(keys.authentication),
    newKeyAgreementKeys: [formatPublicKey(keys.encryption)],
    newAttestationKey: keys.attestation
      ? formatPublicKey(keys.attestation)
      : undefined,
    newDelegationKey: keys.delegation
      ? formatPublicKey(keys.delegation)
      : undefined,
    newEndpointUrl: endpointUrl ? encodeEndpointUrl(endpointUrl) : undefined,
  }
  return new (registry.getOrThrow<DidCreationOperation>(
    'DidCreationOperation'
  ))(registry, didCreateRaw)
}

function matchKeyOperation(keypair: IPublicKey | undefined | null) {
  if (keypair && typeof keypair === 'object') {
    return { Change: formatPublicKey(keypair) }
  }
  if (keypair === null) {
    return { Delete: null }
  }
  return { Ignore: null }
}

export function encodeDidUpdate(
  registry: Registry,
  {
    didIdentifier,
    txCounter,
    keysToUpdate = {},
    publicKeysToRemove = [],
    newEndpointUrl,
  }: IUpdateOptions
): DidUpdateOperation {
  const { authentication, encryption, attestation, delegation } = keysToUpdate
  const didUpdateRaw = {
    did: didIdentifier,
    newAuthenticationKey: authentication
      ? formatPublicKey(authentication)
      : null,
    newKeyAgreementKeys: encryption ? [formatPublicKey(encryption)] : [],
    attestationKeyUpdate: matchKeyOperation(attestation),
    delegationKeyUpdate: matchKeyOperation(delegation),
    publicKeysToRemove,
    newEndpointUrl: newEndpointUrl
      ? encodeEndpointUrl(newEndpointUrl)
      : undefined,
    txCounter,
  }
  return new (registry.getOrThrow<DidUpdateOperation>('DidUpdateOperation'))(
    registry,
    didUpdateRaw
  )
}

export function encodeDidDelete(
  registry: Registry,
  { didIdentifier, txCounter }: IDeleteOptions
): DidDeletionOperation {
  return new (registry.getOrThrow<DidDeletionOperation>(
    'DidDeletionOperation'
  ))(registry, {
    did: didIdentifier,
    txCounter,
  })
}

export function encodeCallAuthentication(
  registry: Registry,
  { didIdentifier, txCounter, call }: IAuthorizeCallOptions
): DidAuthorizedCallOperation {
  return new (registry.getOrThrow<DidAuthorizedCallOperation>(
    'DidAuthorizedCallOperation'
  ))(registry, {
    did: didIdentifier,
    txCounter,
    call,
  })
}

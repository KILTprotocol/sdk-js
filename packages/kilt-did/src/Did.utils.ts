import { SDKErrors } from '@kiltprotocol/utils'
import { TypeRegistry } from '@polkadot/types'
import type { Codec } from '@polkadot/types/types'
import type {
  DidSigned,
  PublicKeyEnum,
  IKeyPair,
  ISigningKeyPair,
  UrlEnum,
  Nullable,
  KeySet,
} from './types'
import type {
  IDidCreationOperation,
  IDidDeletionOperation,
  IDidUpdateOperation,
  KeyId,
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

export function formatPublicKey(keypair: IKeyPair): PublicKeyEnum {
  const { type, publicKey } = keypair
  return { [type]: publicKey }
}

export function isIKeyPair(keypair: unknown): keypair is IKeyPair {
  return (
    typeof keypair === 'object' &&
    !!keypair &&
    'publicKey' in keypair &&
    keypair['publicKey'] instanceof Uint8Array &&
    'type' in keypair &&
    typeof keypair['type'] === 'string'
  )
}

export function encodeEndpointUrl(url: string): UrlEnum {
  const typedUrl: Record<string, unknown> = {}
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
  return typedUrl
}

export function encodeDidCreate(
  typeRegistry: TypeRegistry,
  did: string,
  keys: KeySet,
  endpoint_url?: string
): IDidCreationOperation {
  // build did create object
  const didCreateRaw = {
    did: getIdentifierFromDid(did),
    new_auth_key: formatPublicKey(keys.authentication),
    new_key_agreement_key: formatPublicKey(keys.encryption),
    new_attestation_key: keys.attestation
      ? formatPublicKey(keys.attestation)
      : undefined,
    new_delegation_key: keys.delegation
      ? formatPublicKey(keys.delegation)
      : undefined,
    new_endpoint_url: endpoint_url
      ? encodeEndpointUrl(endpoint_url)
      : undefined,
  }
  return new (typeRegistry.getOrThrow<IDidCreationOperation>(
    'DidCreationOperation'
  ))(typeRegistry, didCreateRaw)
}

function matchKeyOperation(keypair: IKeyPair | undefined | null) {
  return keypair && typeof keypair === 'object'
    ? { Change: formatPublicKey(keypair) }
    : keypair === null
    ? { Delete: null }
    : { Ignore: null }
}

export function encodeDidUpdate(
  typeRegistry: TypeRegistry,
  did: string,
  tx_counter: number,
  keysToUpdate: Partial<Nullable<KeySet>>,
  verification_keys_to_remove: KeyId[] = [],
  new_endpoint_url?: string
): IDidUpdateOperation {
  const { authentication, encryption, attestation, delegation } = keysToUpdate
  const didUpdateRaw = {
    did: getIdentifierFromDid(did),
    new_auth_key: authentication ? formatPublicKey(authentication) : null,
    new_key_agreement_key: encryption ? [formatPublicKey(encryption)] : [],
    new_attestation_key: matchKeyOperation(attestation),
    new_delegation_key: matchKeyOperation(delegation),
    verification_keys_to_remove,
    new_endpoint_url: new_endpoint_url
      ? encodeEndpointUrl(new_endpoint_url)
      : undefined,
    tx_counter,
  }
  return new (typeRegistry.getOrThrow<IDidUpdateOperation>(
    'DidUpdateOperation'
  ))(typeRegistry, didUpdateRaw)
}

export function encodeDidDelete(
  typeRegistry: TypeRegistry,
  did: string,
  tx_counter: number
): IDidDeletionOperation {
  return new (typeRegistry.getOrThrow<IDidDeletionOperation>(
    'DidDeletionOperation'
  ))(typeRegistry, {
    did: getIdentifierFromDid(did),
    tx_counter,
  })
}

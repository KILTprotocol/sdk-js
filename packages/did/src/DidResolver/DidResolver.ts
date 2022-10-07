/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  DidResolutionResult,
  DidResourceUri,
  DidUri,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'

import * as Did from '../index.js'
import { toChain } from '../Did.chain.js'
import { linkedInfoFromChain } from '../Did.rpc.js'
import { getFullDidUri, parse } from '../Did.utils.js'

/**
 * Resolve a DID URI to the DID document and its metadata.
 *
 * The URI can also identify a key or a service, but it will be ignored during resolution.
 *
 * @param did The subject's DID.
 * @returns The details associated with the DID subject.
 */
export async function resolve(
  did: DidUri
): Promise<DidResolutionResult | null> {
  const { type } = parse(did)
  const api = ConfigService.get('api')

  let document: DidDocument | undefined
  // eslint-disable-next-line no-useless-catch
  try {
    const encodedLinkedInfo = await api.rpc.did.query(toChain(did))
    document = linkedInfoFromChain(encodedLinkedInfo).document
  } catch {
    // ignore errors
  }

  if (type === 'full' && document) {
    return {
      document,
      metadata: {
        deactivated: false,
      },
    }
  }

  // If the full DID has been deleted (or the light DID was upgraded and deleted),
  // return the info in the resolution metadata.
  const isFullDidDeleted = (await api.query.did.didBlacklist(toChain(did)))
    .isSome
  if (isFullDidDeleted) {
    return {
      // No canonicalId and no details are returned as we consider this DID deactivated/deleted.
      metadata: {
        deactivated: true,
      },
    }
  }

  if (type === 'full') {
    return null
  }

  const lightDocument = Did.parseDocumentFromLightDid(did, false)
  // If a full DID with same subject is present, return the resolution metadata accordingly.
  if (document) {
    return {
      metadata: {
        canonicalId: getFullDidUri(did),
        deactivated: false,
      },
    }
  }

  // If no full DID details nor deletion info is found, the light DID is un-migrated.
  // Metadata will simply contain `deactivated: false`.
  return {
    document: lightDocument,
    metadata: {
      deactivated: false,
    },
  }
}

type CompliantDidResolutionResult = Omit<DidResolutionResult, 'document'> & {
  document?: DidDocument | { uri: DidUri }
}

/**
 * Resolve a DID URI to the DID document and its metadata.
 * This alternative to `resolve()` behaves closer to the DID specification
 * when it resolves a light DID that has been upgraded to a full DID.
 * In this case `strictResolve()` will return a `document` that only contains `uri`,
 * while `resolve()` takes a more practical approach and does not return `document`.
 *
 * The URI can also identify a key or a service, but it will be ignored during resolution.
 *
 * @param did The subject's DID.
 * @returns The details associated with the DID subject.
 */
export async function strictResolve(
  did: DidUri
): Promise<CompliantDidResolutionResult | null> {
  const resolved = await resolve(did)

  if (!resolved?.metadata.canonicalId) {
    return resolved
  }

  return {
    document: {
      uri: did,
    },
    metadata: resolved.metadata,
  }
}

/**
 * Resolve a DID key URI to the key details.
 *
 * @param keyUri The DID key URI.
 * @returns The details associated with the key.
 */
export async function resolveKey(
  keyUri: DidResourceUri
): Promise<ResolvedDidKey> {
  const { did, fragment: keyId } = parse(keyUri)

  // A fragment (keyId) IS expected to resolve a key.
  if (!keyId) {
    throw new SDKErrors.InvalidDidFormatError(keyUri)
  }

  const resolved = await resolve(did)
  if (!resolved) {
    throw new SDKErrors.DidNotFoundError()
  }

  const {
    document,
    metadata: { canonicalId },
  } = resolved

  // If the light DID has been upgraded we consider the old key URI invalid, the full DID URI should be used instead.
  if (canonicalId) {
    throw new SDKErrors.DidResolveUpgradedDidError()
  }
  if (!document) {
    throw new SDKErrors.DidDeactivatedError()
  }

  const key = Did.getKey(document, keyId)
  if (!key) {
    throw new SDKErrors.DidNotFoundError('Key not found in DID')
  }

  const { includedAt } = key
  return {
    controller: did,
    id: `${did}${keyId}`,
    publicKey: key.publicKey,
    type: key.type,
    ...(includedAt && { includedAt }),
  }
}

/**
 * Resolve a DID service URI to the service details.
 *
 * @param serviceUri The DID service URI.
 * @returns The details associated with the service endpoint.
 */
export async function resolveService(
  serviceUri: DidResourceUri
): Promise<ResolvedDidServiceEndpoint> {
  const { did, fragment: serviceId } = parse(serviceUri)

  // A fragment (serviceId) IS expected to resolve a key.
  if (!serviceId) {
    throw new SDKErrors.InvalidDidFormatError(serviceUri)
  }

  const resolved = await resolve(did)
  if (!resolved) {
    throw new SDKErrors.DidNotFoundError()
  }

  const {
    document,
    metadata: { canonicalId },
  } = resolved

  // If the light DID has been upgraded we consider the old service URI invalid, the full DID URI should be used instead.
  if (canonicalId) {
    throw new SDKErrors.DidResolveUpgradedDidError()
  }
  if (!document) {
    throw new SDKErrors.DidDeactivatedError()
  }

  const service = Did.getService(document, serviceId)
  if (!service) {
    throw new SDKErrors.DidNotFoundError('Service not found in DID')
  }

  return {
    ...service,
    id: `${did}${serviceId}`,
  }
}

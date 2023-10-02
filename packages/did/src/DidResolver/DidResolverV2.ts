/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ConfigService } from '@kiltprotocol/config'
import { DidDocumentV2, DidResolverV2 } from '@kiltprotocol/types'
import { linkedInfoFromChain } from '../Did.rpc'
import { toChain } from '../Did2.chain.js'
import {
  encodeVerificationMethodToMultiKey,
  getFullDidUri,
  parse,
  validateUri,
} from '../Did2.utils.js'
import { parseDocumentFromLightDid } from '../DidDetailsv2/LightDidDetailsV2.js'

type InternalResolutionResult = {
  document?: DidDocumentV2.DidDocument
  documentMetadata: DidResolverV2.DidDocumentMetadata
}

async function resolveInternal(
  did: DidDocumentV2.DidUri
): Promise<InternalResolutionResult | null> {
  const { type } = parse(did)
  const api = ConfigService.get('api')

  const { document, web3Name } = await api.call.did
    .query(toChain(did))
    .then(linkedInfoFromChain)
    .catch(() => ({ document: undefined, web3Name: undefined }))

  if (type === 'full' && document !== undefined) {
    const newDidDocument: DidDocumentV2.DidDocument = {
      id: did,
      authentication: [document.authentication[0].id],
      verificationMethod: [
        encodeVerificationMethodToMultiKey(did, document.authentication[0].id, {
          publicKey: document.authentication[0].publicKey,
          keyType: document.authentication[0].type,
        }),
      ],
      service: document.service,
    }
    if (document.assertionMethod !== undefined) {
      newDidDocument.assertionMethod = document.assertionMethod.map((k) => k.id)
      newDidDocument.verificationMethod.push(
        ...document.assertionMethod.map((k) =>
          encodeVerificationMethodToMultiKey(did, k.id, {
            keyType: k.type,
            publicKey: k.publicKey,
          })
        )
      )
    }
    if (document.keyAgreement !== undefined) {
      newDidDocument.assertionMethod = document.keyAgreement.map((k) => k.id)
      newDidDocument.verificationMethod.push(
        ...document.keyAgreement.map((k) =>
          encodeVerificationMethodToMultiKey(did, k.id, {
            keyType: k.type,
            publicKey: k.publicKey,
          })
        )
      )
    }
    if (document.capabilityDelegation !== undefined) {
      newDidDocument.assertionMethod = document.capabilityDelegation.map(
        (k) => k.id
      )
      newDidDocument.verificationMethod.push(
        ...document.capabilityDelegation.map((k) =>
          encodeVerificationMethodToMultiKey(did, k.id, {
            keyType: k.type,
            publicKey: k.publicKey,
          })
        )
      )
    }
    if (web3Name !== undefined) {
      newDidDocument.alsoKnownAs = [web3Name]
    }

    return {
      document: newDidDocument,
      documentMetadata: {},
    }
  }

  const isFullDidDeleted = (await api.query.did.didBlacklist(toChain(did)))
    .isSome
  if (isFullDidDeleted) {
    return {
      // No canonicalId and no details are returned as we consider this DID deactivated/deleted.
      documentMetadata: {
        deactivated: true,
      },
    }
  }

  if (type === 'full') {
    return null
  }

  const lightDocument = parseDocumentFromLightDid(did, false)
  // If a full DID with same subject is present, return the resolution metadata accordingly.
  if (document !== undefined) {
    return {
      documentMetadata: {
        canonicalId: getFullDidUri(did),
      },
    }
  }

  // If no full DID details nor deletion info is found, the light DID is un-migrated.
  // Metadata will simply contain `deactivated: false`.
  return {
    document: lightDocument,
    documentMetadata: {},
  }
}

async function resolve(
  did: DidDocumentV2.DidUri,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolutionOptions: DidResolverV2.DidResolutionOptions
): Promise<DidResolverV2.ResolutionResult> {
  const result: DidResolverV2.ResolutionResult = {
    didDocumentMetadata: {},
    didResolutionMetadata: {},
  }

  try {
    validateUri(did, 'Did')
  } catch (error) {
    result.didResolutionMetadata.error = 'invalidDid'
    return result
  }

  const resolutionResult = await resolveInternal(did)
  if (!resolutionResult) {
    result.didResolutionMetadata.error = 'notFound'
    return result
  }

  const { documentMetadata, document } = resolutionResult

  result.didDocument = document
  result.didDocumentMetadata = documentMetadata

  return result
}

// TODO: Implement DID dereferencing
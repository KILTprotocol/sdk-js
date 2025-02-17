/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ICType } from '@kiltprotocol/types'

import { fetchFromChain } from './CType.chain.js'
import { idToHash, isICType } from './CType.js'

export type CTypeLoader = (id: ICType['$id']) => Promise<ICType>

const loadCType: CTypeLoader = async (id) => {
  return (await fetchFromChain(id)).cType
}

/**
 * A factory for a CType loader that caches a CType definition once it has been loaded.
 * Used in validating the credentialSubject of a {@link KiltCredentialV1} against the Claim Type referenced in its `type` field.
 *
 * @param initialCTypes An array of CTypes with which the cache is to be initialized.
 * @returns A function that takes a CType id and looks up a CType definition in an internal cache, and if not found, tries to fetch it from the KILT blochchain.
 */
export function newCachingCTypeLoader(
  initialCTypes: ICType[] = []
): CTypeLoader {
  const ctypes: Map<string, ICType> = new Map()

  initialCTypes.forEach((ctype) => {
    ctypes.set(ctype.$id, ctype)
  })

  async function getCType(id: ICType['$id']): Promise<ICType> {
    const ctype: ICType = ctypes.get(id) ?? (await loadCType(id))
    ctypes.set(ctype.$id, ctype)
    return ctype
  }
  return getCType
}

export async function loadNestedCTypeDefinitions(
  cType: ICType,
  cTypeLoader: CTypeLoader
): Promise<ICType[]> {
  const fetchedCTypeIds = new Set<string>()
  const fetchedCTypeDefinitions: ICType[] = []

  // Don't fetch the original CType
  fetchedCTypeIds.add(cType.$id)

  async function extractRefsFrom(value: unknown): Promise<void> {
    if (typeof value !== 'object' || value === null) {
      return
    }

    if ('$ref' in value) {
      const ref = (value as { $ref: unknown }).$ref
      if (typeof ref === 'string' && ref.startsWith('kilt:ctype:')) {
        const cTypeId = ref.split('#/')[0] as ICType['$id']

        if (!fetchedCTypeIds.has(cTypeId)) {
          fetchedCTypeIds.add(cTypeId)
          const referencedCType = await cTypeLoader(cTypeId)

          if (isICType(referencedCType)) {
            fetchedCTypeDefinitions.push(referencedCType)
          } else {
            throw new Error(`Failed to load referenced CType: ${cTypeId}`)
          }

          await extractRefsFrom(referencedCType.properties)
        }
      }
      return
    }

    // Process all values in the object. Also works for arrays
    await Promise.all(Object.values(value).map(extractRefsFrom))
  }

  await extractRefsFrom(cType.properties)

  return fetchedCTypeDefinitions
}

export function combineCTypeLoaders(...loaders: CTypeLoader[]): CTypeLoader {
  const validLoaders = loaders.filter(
    (l): l is CTypeLoader => typeof l === 'function'
  )

  return async (id) => {
    // Ensure the ID is in the correct format
    idToHash(id)

    // eslint-disable-next-line no-restricted-syntax
    for (const loadCTypes of validLoaders) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const cType = await loadCTypes(id)
        if (isICType(cType)) {
          return cType
        }
      } catch {
        // noop
      }
    }

    throw new Error(`Unable to load CType ${id}`)
  }
}

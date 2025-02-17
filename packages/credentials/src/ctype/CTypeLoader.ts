/**
 * Copyright (c) 2025, KILT Foundation.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { fetchFromChain } from './CType.chain.js'
import { isICType, verifyDataStructure } from './CType.js'

export type CTypeLoader = (id: ICType['$id']) => Promise<ICType>

const chainCTypeLoader: CTypeLoader = async (id) => {
  return (await fetchFromChain(id)).cType
}

/**
 * A factory for a CType loader that caches a CType definition once it has been loaded.
 * Used in validating the credentialSubject of a {@link KiltCredentialV1} against the Claim Type referenced in its `type` field.
 *
 * @param initialCTypes An array of CTypes with which the cache is to be initialized.
 * @param cTypeLoader A basic {@link CTypeLoader} to augment with a caching layer.
 * Defaults to loading CType definitions from the KILT blockchain.
 * @returns A function that takes a CType id and looks up a CType definition in an internal cache, and if not found, tries to fetch it from an external source.
 */
export function newCachingCTypeLoader(
  initialCTypes: ICType[] = [],
  cTypeLoader = chainCTypeLoader
): CTypeLoader {
  const ctypes: Map<string, ICType> = new Map()

  initialCTypes.forEach((ctype) => {
    ctypes.set(ctype.$id, ctype)
  })

  async function getCType(id: ICType['$id']): Promise<ICType> {
    const ctype: ICType = ctypes.get(id) ?? (await cTypeLoader(id))
    verifyDataStructure(ctype)
    if (id !== ctype.$id) {
      throw new SDKErrors.CTypeIdMismatchError(ctype.$id, id)
    }
    ctypes.set(ctype.$id, ctype)
    return ctype
  }
  return getCType
}

/**
 * Recursively traverses a (nested) CType's definition to load definitions of CTypes referenced within.
 *
 * @param cType A (nested) CType containg references to other CTypes.
 * @param cTypeLoader A function with which to load CType definitions.
 * @returns An array of CType definitions which were referenced in the original CType or in any of its composite CTypes.
 */
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

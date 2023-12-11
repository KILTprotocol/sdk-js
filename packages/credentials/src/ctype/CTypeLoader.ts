/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ICType } from '@kiltprotocol/types'

import { fetchFromChain } from './CType.chain.js'

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

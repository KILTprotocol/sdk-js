/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { CType } from '@kiltprotocol/core'
import type { ICType } from '@kiltprotocol/types'

import { jsonLdExpandCredentialSubject } from './common.js'
import type { KiltCredentialV1 } from './types.js'

export type CTypeLoader = (id: ICType['$id']) => Promise<ICType>

const loadCType: CTypeLoader = async (id) => {
  return (await CType.fetchFromChain(id)).ctype
}

/**
 * A factory for a CType loader that caches a CType definition once it has been loaded.
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

const cachingCTypeLoader = newCachingCTypeLoader()

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition.
 *
 * @param credential A [[KiltCredentialV1]] type verifiable credential.
 * @param credential.credentialSubject The credentialSubject to be validated.
 * @param options Options map.
 * @param options.cTypes One or more CType definitions to be used for validation. If `loadCTypes` is set to `false`, validation will fail if the definition of the credential's CType is not given.
 * @param options.loadCTypes A function to load CType definitions that are not in `cTypes`. Defaults to using the [[CachingCTypeLoader]]. If set to `false` or `undefined`, no additional CTypes will be loaded.
 */
export async function validateSubject(
  { credentialSubject }: Pick<KiltCredentialV1, 'credentialSubject'>,
  {
    cTypes = [],
    loadCTypes = cachingCTypeLoader,
  }: { cTypes?: ICType[]; loadCTypes?: false | CTypeLoader } = {}
): Promise<void> {
  // get CType id referenced in credential
  const credentialsCTypeId = credentialSubject['@context']['@vocab'].replace(
    '#',
    ''
  ) as ICType['$id']
  // check that we have access to the right schema
  let cType = cTypes?.find(({ $id }) => $id === credentialsCTypeId)
  if (!cType) {
    if (typeof loadCTypes !== 'function') {
      throw new Error(
        `The definition for this credential's CType ${credentialsCTypeId} has not been passed to the validator and CType loading has been disabled`
      )
    }
    cType = await loadCTypes(credentialsCTypeId)
    if (cType.$id !== credentialsCTypeId) {
      throw new Error('failed to load correct CType')
    }
  }

  // normalize credential subject to form expected by CType schema
  const expandedClaims: Record<string, unknown> =
    jsonLdExpandCredentialSubject(credentialSubject)
  delete expandedClaims['@id']

  const vocab = `${cType.$id}#`
  const claims = Object.entries(expandedClaims).reduce((obj, [key, value]) => {
    if (!key.startsWith(vocab)) {
      throw new Error(
        `The credential contains claims which do not follow the expected CType: ${key}`
      )
    }
    return {
      ...obj,
      [key.substring(vocab.length)]: value,
    }
  }, {})
  // validates against CType (also validates CType schema itself)
  CType.verifyClaimAgainstSchema(claims, cType)
}

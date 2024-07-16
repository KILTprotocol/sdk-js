/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { signersForDid } from '@kiltprotocol/did'
import type { DidUrl, SignerInterface } from '@kiltprotocol/types'
import { Signers } from '@kiltprotocol/utils'

import type { SharedArguments } from './interfaces.js'

export { createDid } from './createDid.js'
export { deactivateDid } from './deactivateDid.js'
export { addService, removeService } from './service.js'
export { transact } from './transact.js'
export {
  removeVerificationMethod,
  setVerificationMethod,
} from './verificationMethod.js'
export { claimWeb3Name, releaseWeb3Name } from './w3names.js'

/**
 * Selects and returns a DID signer for a given purpose and algorithm.
 *
 * @param options All options.
 * @param options.signers Signers from which to choose from; can also be `KeyringPair` instances or other key pair representations.
 * @param options.relationship Which verification relationship the key should have to the DID.
 * Defaults to `authentication`.
 * @param options.algorithm Optionally filter signers by algorithm(s).
 * @param options.didDocument The DID's DID document.
 */
export async function selectSigner({
  didDocument,
  signers,
  relationship = 'authentication',
  algorithm,
}: Pick<SharedArguments, 'didDocument' | 'signers'> & {
  relationship?: string
  algorithm?: string | string[]
}): Promise<SignerInterface<string, DidUrl> | undefined> {
  const mappedSigners = await signersForDid(didDocument, ...signers)
  const selectors = [
    Signers.select.byDid(didDocument, {
      verificationRelationship: relationship,
    }),
  ]
  if (typeof algorithm !== 'undefined') {
    Signers.select.byAlgorithm(
      Array.isArray(algorithm) ? algorithm : [algorithm]
    )
  }

  return Signers.selectSigner(mappedSigners, ...selectors)
}

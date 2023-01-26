/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  Caip19AssetId,
  Caip19AssetInstance,
  Caip19AssetNamespace,
  Caip19AssetReference,
  Caip2ChainId,
  Caip2ChainNamespace,
  Caip2ChainReference,
} from '@kiltprotocol/types'

// Matches CAIP-19 ids as per https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md.
const CAIP19_REGEX =
  /^(?<chainId>(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32}))\/(?<assetId>(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-a-zA-Z0-9]{1,64})(\/(?<assetInstance>[-a-zA-Z0-9]{1,78}))?)$/

type Caip19ParsingResult = {
  chainId: Caip2ChainId
  chainNamespace: Caip2ChainNamespace
  chainReference: Caip2ChainReference
  assetId: Caip19AssetId
  assetNamespace: Caip19AssetNamespace
  assetReference: Caip19AssetReference
  assetInstance?: Caip19AssetInstance
}

/**
 * Parses a CAIP-19 identifier and returns the information contained within in a structured form.

 * @param caip19 A CAIP-19 identifier as a string.
* @returns Object containing information extracted from the identifier.
 */
export function parse(caip19: string): Caip19ParsingResult {
  const matches = CAIP19_REGEX.exec(caip19)?.groups as
    | Caip19ParsingResult
    | undefined
  if (!matches) {
    throw new Error(`not a valid CAIP-19 identifier: ${caip19}`)
  }

  return matches
}

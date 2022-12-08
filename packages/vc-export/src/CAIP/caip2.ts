/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Caip2ChainNamespace, Caip2ChainReference } from '@kiltprotocol/types'
import { u8aToHex } from '@polkadot/util'

/**
 * Produces the CAIP-2 identifier for a polkadot-based chain from its genesis hash.
 *
 * @param genesisHash The chain's genesis hash.
 * @returns A CAIP-2 identifier of the form `polkadot:{32 hex characters}` as described in CAIP-13.
 */
export function chainIdFromGenesis(
  genesisHash: Uint8Array
): `polkadot:${string}` {
  return `polkadot:${u8aToHex(genesisHash.subarray(0, 16), undefined, false)}`
}

// Matches CAIP-2 ids as per https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md.
const CAIP2_REGEX =
  /^(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32})$/

type Caip2ParsingResult = {
  chainNamespace: Caip2ChainNamespace
  chainReference: Caip2ChainReference
}

/**
 * Parses a CAIP-2 identifier and returns the information contained within in a structured form.

 * @param caip2 A CAIP-2 identifier as a string.
* @returns Object containing information extracted from the identifier.
 */
export function parse(caip2: string): Caip2ParsingResult {
  const matches = CAIP2_REGEX.exec(caip2)?.groups as
    | Caip2ParsingResult
    | undefined
  if (!matches) {
    throw new Error(`not a valid CAIP-2 identifier: ${caip2}`)
  }

  return matches
}

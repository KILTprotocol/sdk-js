/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'

import type { DidKey, NewDidKey } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import { ChainDidPublicKey, formatPublicKey } from '../Did.chain.js'
import { isEncryptionKey, isVerificationKey } from '../Did.utils.js'

function computeChainKeyId(publicKey: ChainDidPublicKey): DidKey['id'] {
  return Crypto.hashStr(publicKey.toU8a())
}

function encodeToChainKey(api: ApiPromise, key: NewDidKey): ChainDidPublicKey {
  let keyClass: string
  if (isVerificationKey(key)) {
    keyClass = 'PublicVerificationKey'
  } else if (isEncryptionKey(key)) {
    keyClass = 'PublicEncryptionKey'
  } else {
    throw TypeError('Unsupported key type.')
  }
  return new (api.registry.getOrThrow<ChainDidPublicKey>(
    'DidDidDetailsDidPublicKey'
  ))(api.registry, {
    [keyClass]: formatPublicKey(key),
  })
}

export function deriveChainKeyId(
  api: ApiPromise,
  key: NewDidKey
): DidKey['id'] {
  return computeChainKeyId(encodeToChainKey(api, key))
}

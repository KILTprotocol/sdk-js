/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import { ApiPromise } from '@polkadot/api'

import type { DidKey, NewDidKey } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { ChainDidPublicKey, encodePublicKey } from '../Did.chain.js'
import { isEncryptionKey, isVerificationKey } from '../Did.utils.js'

function computeChainKeyId(publicKey: ChainDidPublicKey): DidKey['id'] {
  return Crypto.hashStr(publicKey.toU8a())
}

function encodeToChainKey(api: ApiPromise, key: NewDidKey): ChainDidPublicKey {
  if (isVerificationKey(key)) {
    return new (api.registry.getOrThrow<ChainDidPublicKey>(
      'DidDidDetailsDidPublicKey'
    ))(api.registry, {
      PublicVerificationKey: encodePublicKey(key),
    })
  }
  if (isEncryptionKey(key)) {
    return new (api.registry.getOrThrow<ChainDidPublicKey>(
      'DidDidDetailsDidPublicKey'
    ))(api.registry, {
      PublicEncryptionKey: encodePublicKey(key),
    })
  }
  throw new SDKErrors.DidBuilderError('Unsupported key type')
}

export function deriveChainKeyId(
  api: ApiPromise,
  key: NewDidKey
): DidKey['id'] {
  return computeChainKeyId(encodeToChainKey(api, key))
}

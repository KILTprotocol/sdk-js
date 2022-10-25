/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'
import type { AccountId } from '@polkadot/types/interfaces'
import type { PublicCredentialsCredentialsCredential } from '@kiltprotocol/augment-api'
import type { DidUri, INewPublicCredential } from '@kiltprotocol/types'

import { blake2AsHex } from '@polkadot/util-crypto'
import { ConfigService } from '@kiltprotocol/config'
import { toChain as didUriToChain } from '@kiltprotocol/did'

import { toChain as publicCredentialToChain } from './PublicCredential.chain.js'

export function getIdForPublicCredentialAndAttester(
  credential: INewPublicCredential,
  attester: DidUri
): HexString {
  const api = ConfigService.get('api')

  const scaleEncodedCredential = api
    .createType<PublicCredentialsCredentialsCredential>(
      'PublicCredentialsCredentialsCredential',
      publicCredentialToChain(credential)
    )
    .toU8a()
  const scaleEncodedAttester = api
    .createType<AccountId>('AccountId', didUriToChain(attester))
    .toU8a()

  return blake2AsHex(
    Uint8Array.from([...scaleEncodedCredential, ...scaleEncodedAttester])
  )
}

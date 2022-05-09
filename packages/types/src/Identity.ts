/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import type { BoxKeyPair } from 'tweetnacl'
import type { Index } from '@polkadot/types/interfaces'
import type { AnyNumber } from '@polkadot/types/types'
import type { KeyringPair } from './index.js'

export interface IIdentity {
  readonly signKeyringPair: KeyringPair
  readonly seed: Uint8Array
  readonly seedAsHex: string
  readonly signPublicKeyAsHex: string
  readonly boxKeyPair: BoxKeyPair
  address: KeyringPair['address']
  serviceAddress?: string
  signSubmittableExtrinsic(
    submittableExtrinsic: SubmittableExtrinsic,
    nonce: AnyNumber | Index,
    tip?: AnyNumber
  ): Promise<SubmittableExtrinsic>
}

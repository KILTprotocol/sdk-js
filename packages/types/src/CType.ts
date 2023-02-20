/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'

export type InstanceType = 'boolean' | 'integer' | 'number' | 'string'

export type CTypeHash = HexString

export interface ICType {
  $id: `kilt:ctype:${CTypeHash}`
  $schema: string
  title: string
  properties: {
    [key: string]: { type: InstanceType; format?: string } | { $ref: string }
  }
  type: 'object'
  additionalProperties?: false
}

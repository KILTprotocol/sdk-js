/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'

export type InstanceType =
  | 'array'
  | 'boolean'
  | 'integer'
  | 'null'
  | 'number'
  | 'object'
  | 'string'

export type CTypeHash = HexString

export interface ICType {
  $id: `kilt:ctype:${CTypeHash}`
  $schema: string
  title: string
  properties: {
    [key: string]: { $ref?: string; type?: InstanceType; format?: string }
  }
  type: 'object'
}

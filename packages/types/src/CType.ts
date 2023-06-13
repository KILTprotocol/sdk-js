/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from './Imported'

export type InstanceType = 'boolean' | 'integer' | 'number' | 'string' | 'array'

export type CTypeHash = HexString

interface TypePattern {
  type: InstanceType
}

interface StringPattern extends TypePattern {
  type: 'string'
  format?: 'date' | 'time' | 'uri'
  enum?: string[]
  minLength?: number
  maxLength?: number
}

interface NumberPattern extends TypePattern {
  type: 'integer' | 'number'
  enum?: number[]
  minimum?: number
  maximum?: number
}

interface BooleanPattern extends TypePattern {
  type: 'boolean'
}

interface RefPattern {
  $ref: string
}

interface ArrayPattern extends TypePattern {
  type: 'array'
  items: BooleanPattern | NumberPattern | StringPattern | RefPattern
  minItems?: number
  maxItems?: number
}

export interface ICType {
  $id: `kilt:ctype:${CTypeHash}`
  $schema: string
  title: string
  properties: {
    [key: string]:
      | BooleanPattern
      | NumberPattern
      | StringPattern
      | ArrayPattern
      | RefPattern
  }
  type: 'object'
  additionalProperties?: false
}

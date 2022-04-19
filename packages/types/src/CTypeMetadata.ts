/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType } from './CType'

/**
 * @packageDocumentation
 * @module ICTypeMetadata
 */

/**
 * String struct with string keys and a mandatory `default` field.
 * Meant to contain a default label/description and an arbitrary number of translations,
 * where keys represent the use case (language) and values are the labels for this use case.
 */
export interface IMultilangLabel {
  /** Default label in the original language. */
  default: string
  /** An arbitrary number of translations where the key indicates the language. */
  [key: string]: string
}

export type IMetadataProperties = {
  [key: string]: { title: IMultilangLabel; description?: IMultilangLabel }
}

export interface IMetadata {
  title: IMultilangLabel
  description?: IMultilangLabel
  properties: IMetadataProperties
}

export interface ICTypeMetadata {
  metadata: IMetadata
  ctypeHash: ICType['hash'] | null
}

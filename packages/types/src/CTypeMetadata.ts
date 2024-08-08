/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType } from './CType'

/**
 * String struct with string keys and a mandatory `default` field.
 * Meant to contain a default label/description and an arbitrary number of translations,
 * where keys represent the use case (language) and values are the labels for this use case.
 */
export interface IMultiLangLabel {
  /** Default label in the original language. */
  default: string
  /** An arbitrary number of translations where the key indicates the language. */
  [key: string]: string
}

export type IMetadataProperties = {
  [key: string]: { title: IMultiLangLabel; description?: IMultiLangLabel }
}

export interface IMetadata {
  title: IMultiLangLabel
  description?: IMultiLangLabel
  properties: IMetadataProperties
}

export interface ICTypeMetadata {
  metadata: IMetadata
  cTypeId: ICType['$id'] | null
}

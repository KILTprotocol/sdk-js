/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * CTypes are the way the KILT protocol enables a Claimer or Attester or Verifier to create a [[Claim]] schema for creating specific credentials.
 *
 * * A CTYPE is a description of the [[Claim]] data structure, based on [JSON Schema](http://json-schema.org/).
 * * CTYPEs are published and stored by the creator and/or in an open storage registry.
 * * Anyone can use a CTYPE to create a new [[Claim]].
 *
 * @packageDocumentation
 * @module CType
 * @preferred
 */

export * as CType from './CType.js'
export * as CTypeUtils from './CType.utils.js'
export { CTypeMetadata } from './CTypeMetadata.js'
export * as CTypeSchema from './CTypeSchema.js'

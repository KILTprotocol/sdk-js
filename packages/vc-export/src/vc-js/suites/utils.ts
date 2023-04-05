/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { JsonLdObj } from '../documentLoader'

/**
 * Tests whether a provided JSON-LD document includes a context url in its
 * `@context` property.
 *
 * @param options - Options hashmap.
 * @param options.document - A JSON-LD document.
 * @param options.contextUrl - A context url.
 *
 * @returns Returns true if document includes context.
 */
export function includesContext({
  document,
  contextUrl,
}: {
  document?: JsonLdObj
  contextUrl: string
}): boolean {
  const ctx = document?.['@context']
  return ctx === contextUrl || (Array.isArray(ctx) && ctx.includes(contextUrl))
}

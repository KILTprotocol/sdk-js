/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RemoteDocument, Url } from 'jsonld/jsonld-spec'
import vcjs from '@digitalbazaar/vc'
import * as jsigs from 'jsonld-signatures'
import { validationContexts } from './context/index.js'

/**
 * Document loader that provides access to the JSON-LD contexts required for verifying Kilt VCs.
 * Essentially wraps the vc-js defaultDocumentLoader, but additionally loads KILTs [[validationContexts]].
 *
 * @param url Document/context URL to resolve.
 * @returns An object containing the resolution result.
 */
export const documentLoader: (url: Url) => Promise<RemoteDocument> =
  jsigs.extendContextLoader(async (url) => {
    const context = validationContexts[url]
    if (context !== undefined)
      return { contextUrl: undefined, documentUrl: url, document: context }
    return vcjs.defaultDocumentLoader(url)
  })

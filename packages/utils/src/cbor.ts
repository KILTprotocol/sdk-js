/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// special import syntax as this is a pure cjs import
import * as cborImp from 'cbor-web'
// this is horrible but the only way to make this import work in both cjs & esm builds
export const cbor: typeof cborImp = (cborImp as any)?.default ?? cborImp

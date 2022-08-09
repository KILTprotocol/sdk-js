/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { readFile, writeFile } from 'fs/promises'

const path = 'src/interfaces/augment-api-tx.ts'
;(async () => {
  const source = await readFile(path, 'utf8')
  const fixed = source
    .replace(/\bEd25519\b/g, 'ed25519')
    .replace(/\bSr25519\b/g, 'sr25519')
    .replace(/\bX25519\b/g, 'x25519')
    .replace(/\bEcdsa\b/g, 'ecdsa')
  await writeFile(path, fixed, 'utf8')
})()

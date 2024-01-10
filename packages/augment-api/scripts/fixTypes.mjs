/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { readFile, writeFile } from 'fs/promises'
import glob from 'glob'
;(async () => {
  const path = 'src/interfaces/augment-api-tx.ts'
  const source = await readFile(path, 'utf8')
  const fixed = source.replace(/\b(Ed25519|Sr25519|X25519|Ecdsa)\b/g, (match) =>
    match.toLowerCase()
  )
  await writeFile(path, fixed, 'utf8')
})()

const regex = /^(ex|im)port (.+ from )?'\.[^\.;']+(?=';$)/gm
glob('./src/**/*.ts', async (err, matches) => {
  if (err) throw err
  matches.forEach(async (path) => {
    const source = await readFile(path, 'utf8')
    let matched = false
    const fixed = source.replace(regex, (match) => {
      matched = true
      return match + '.js'
    })
    if (!matched) return
    console.log(`adding .js extention to import in ${path}`)
    await writeFile(path, fixed, 'utf8')
  })
})

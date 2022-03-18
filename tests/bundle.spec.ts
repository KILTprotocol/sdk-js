/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { test, expect } from '@playwright/test'
import url from 'url'
import path from 'path'

test('html bundle integration test', async ({ page }) => {
  const fileurl = url.pathToFileURL(
    path.join(__dirname, 'bundle-test.html')
  ).href
  page.on('pageerror', (exception) => {
    console.error(`uncaught exception: "${exception}"`)
    throw new Error('-1')
  })
  page.on('console', async (msg) => {
    console.log(msg.text())
  })
  await page.goto(fileurl)
  await expect(page).toHaveTitle('Bundle tests')

  await page.evaluate(async () => {
    try {
      await window.runAll()
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message)
      }
      throw e
    }
  })
  page.close()
})

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
  page.on('pageerror', (exception) => {
    console.error(`uncaught exception: "${exception}"`)
  })
  const fileurl = url.pathToFileURL(path.join(__dirname, 'bundle-test.html'))
    .href
  await page.goto(fileurl)
  await expect(page).toHaveTitle('Bundle tests')
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`Error text: "${msg.text()}"`)
  })

  page.on('console', (msg) => console.log(msg.text()))
  await page.evaluate(() => {
    return new Promise((resolve) => setTimeout(resolve, 30000))
  })
})

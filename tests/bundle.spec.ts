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
  const fileurl = url.pathToFileURL(path.join(__dirname, 'bundle-test.html'))
    .href
  const msgnr: any[] = []
  const testArray = Array(10).fill(0)
  page.on('pageerror', (exception) => {
    console.error(`uncaught exception: "${exception}"`)
    throw new Error('-1')
  })
  page.on('console', async (msg) => {
    console.log(msg.text())
    const message = msg.args()
    msgnr.push(message[1])
  })
  await page.goto(fileurl)
  await expect(page).toHaveTitle('Bundle tests')

  await page.evaluate(() => {
    return new Promise((resolve) => setTimeout(resolve, 30000))
  })
  msgnr.forEach((value) => {
    if (value && typeof +value === 'number') {
      const number = +value
      testArray[number] += 1
    }
  })
  testArray.forEach((value) => expect(value).toBe(1))
  page.close()
})

/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { test, expect } from '@playwright/test'

test('html bundle integration test', async ({ page }) => {
  page.on('pageerror', exception => {
    console.error(`uncaught exception: "${exception}"`)
  })
  
  await page.goto('file://$(pwd)/../bundle-test.html')
  const title = page.locator('.navbar__inner .navbar__title')
  await expect(title).toHaveText('Bundle tests')
})

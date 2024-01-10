/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type { StartedTestContainer } from 'testcontainers'
import { test, expect } from '@playwright/test'
import url from 'url'
import path from 'path'
import { getStartedTestContainer } from '../integration/utils.js'

declare global {
  interface Window {
    runAll: () => Promise<void>
  }
}

let testcontainer: StartedTestContainer | undefined

const WS_PORT = 9944

test.beforeAll(async () => {
  // start dev node with testcontainers
  testcontainer = await getStartedTestContainer(WS_PORT)
})

test('html bundle integration test', async ({ page }) => {
  const fileUrl = url.pathToFileURL(
    path.join(__dirname, 'bundle-test.html')
  ).href

  page.on('pageerror', (exception) => {
    console.error(exception)
    throw new Error('-1')
  })

  page.on('console', async (msg) => {
    console.log(msg.text())
  })
  await page.goto(fileUrl)
  await expect(page).toHaveTitle('Bundle tests')

  await page.evaluate(async () => {
    try {
      await window.runAll()
    } catch (e) {
      if (e instanceof Error) {
        console.error(e)
      }
      throw e
    }
  })
  await page.close()
})

test.afterAll(async () => {
  if (testcontainer) {
    await testcontainer.stop()
  }
})

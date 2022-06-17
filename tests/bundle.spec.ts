/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import { GenericContainer, Wait, StartedTestContainer } from 'testcontainers'
import { test, expect } from '@playwright/test'
import url from 'url'
import path from 'path'

declare global {
  interface Window {
    runAll: () => Promise<void>
  }
}

let testcontainer: StartedTestContainer

test.beforeAll(async () => {
  // start dev node with testcontainers
  testcontainer = await new GenericContainer(
    process.env.TESTCONTAINERS_NODE_IMG || 'kiltprotocol/mashnet-node:latest'
  )
    .withCmd(['--dev', '--ws-port', '9944', '--ws-external'])
    .withExposedPorts({ container: 9944, host: 9944 })
    .withWaitStrategy(Wait.forLogMessage('Idle'))
    .start()
})

test('html bundle integration test', async ({ page }) => {
  const fileurl = url.pathToFileURL(
    path.join(__dirname, 'bundle-test.html')
  ).href
  page.on('pageerror', (exception) => {
    console.error(exception)
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

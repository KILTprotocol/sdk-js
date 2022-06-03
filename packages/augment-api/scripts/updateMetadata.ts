/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access no-console import/no-extraneous-dependencies */

import fs from 'fs'
import { w3cwebsocket as WebSocket } from 'websocket'

const main = (): void => {
  const endpoint = 'wss://spiritnet.kilt.io/'
  console.log('Connecting to', endpoint)
  const ws = new WebSocket(endpoint)
  ws.onopen = (): void => {
    ws.send(
      '{"id":"1","jsonrpc":"2.0","method":"state_getMetadata","params":[]}'
    )
  }
  ws.onmessage = (msg: any): void => {
    fs.writeFileSync('./metadata.json', msg.data)
    console.log('Done')
    ws.close()
    process.exit(0)
  }
}

main()

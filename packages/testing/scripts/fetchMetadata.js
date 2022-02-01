/* eslint-disable */

const { HttpProvider, WsProvider, ApiPromise } = require('@polkadot/api')
const yargs = require('yargs')
const fs = require('fs')

const { argv } = yargs
  .option('format', {
    alias: 'f',
    description: 'output format: {hex, json}',
    type: 'string',
    default: 'json',
    choices: ['hex', 'json'],
    requiresArg: true,
    // if arg is set multiple times, make the last value count
    coerce: (val) => (Array.isArray(val) ? val.pop() : val),
  })
  .option('endpoint', {
    alias: 'e',
    description: 'http or ws endpoint from which to fetch metadata',
    type: 'string',
    demandOption: true,
    requiresArg: true,
    coerce: (val) => (Array.isArray(val) ? val.pop() : val),
  })
  .option('outfile', {
    alias: 'o',
    description: 'path to output file',
    type: 'string',
    demandOption: true,
    requiresArg: true,
    coerce: (val) => (Array.isArray(val) ? val.pop() : val),
  })
  .help()
  .alias('help', 'h')

let provider

switch (true) {
  case argv.endpoint.startsWith('http'):
    provider = new HttpProvider(argv.endpoint)
    break
  case argv.endpoint.startsWith('ws'):
    provider = new WsProvider(argv.endpoint, false)
    break
  default:
    throw new Error(
      `can only handle ws/wss and http/https endpoints, received ${argv.endpoint}`
    )
}

const api = new ApiPromise({ provider })

let exitCode

async function fetch() {
  api.connect()
  await api.isReady
  let metadata
  switch (argv.format) {
    case 'hex':
      metadata = `"${api.runtimeMetadata.toHex()}"`
      break
    case 'json':
      metadata = JSON.stringify(api.runtimeMetadata.toJSON(), null, 2)
      break
    default:
      throw new Error('unexpected output format')
  }

  console.log(
    `writing metadata to ${argv.outfile}:\n${metadata.substring(0, 100)}...`
  )
  fs.writeFileSync(argv.outfile, metadata)
  console.log('success')
  exitCode = 0
}

const timeout = new Promise((_, reject) => {
  setTimeout(() => {
    exitCode = exitCode || 124
    reject(new Error('timeout waiting for metadata fetch'))
  }, 10000)
})

Promise.race([fetch(), timeout])
  .catch((e) => {
    console.error(`updating metadata failed with ${e}`)
    exitCode = exitCode || 1
  })
  .finally(() => {
    console.log('disconnecting...')
    api.disconnect().then(process.exit(exitCode))
    setTimeout(() => {
      console.error(`timeout while waiting for disconnect`)
      process.exit(exitCode)
    }, 10000)
  })

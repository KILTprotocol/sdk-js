/* eslint-disable */

const { HttpProvider, WsProvider } = require('@polkadot/api')
const yargs = require('yargs')
const fs = require('fs')

const { argv } = yargs
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
      `Can only handle ws/wss and http/https endpoints, received "${argv.endpoint}"`
    )
}

let exitCode

async function fetch() {
  await provider.connect()
  await provider.isReady
  const result = await provider.send('state_getMetadata')

  const metadata = JSON.stringify({ result })

  const outfile = Array.isArray(argv.outfile) ? argv.outfile : [argv.outfile]
  outfile.forEach((file) => {
    console.log(
      `writing metadata to ${file}:\n${metadata.substring(0, 100)}...`
    )
    fs.writeFileSync(file, metadata)
  })
  console.log('success')
  exitCode = 0
}

const timeout = new Promise((_, reject) => {
  setTimeout(() => {
    exitCode = exitCode || 124
    reject(new Error('Timeout waiting for metadata fetch'))
  }, 10000)
})

;(async () => {
  try {
    await Promise.race([fetch(), timeout])
  } catch (error) {
    console.error(`updating metadata failed with ${error}`)
    exitCode = exitCode || 1
  } finally {
    console.log('disconnecting...')
    provider.disconnect().then(process.exit(exitCode))
    setTimeout(() => {
      console.error(`timeout while waiting for disconnect`)
      process.exit(exitCode)
    }, 10000)
  }
})()

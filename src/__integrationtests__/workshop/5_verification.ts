/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as Kilt from '../../index'
import setup from './setup'

/* 🚧 COPY_START for verifyClaim_example (below this comment) 🚧  */
// const Kilt = require('@kiltprotocol/sdk-js') //❗️ UNCOMMENT-LINE in workshop ❗️

async function main() {
  // create an attested claim from the JSON string
  const attestedClaimStruct = (await setup()).attestedClaim // ❗️ REMOVE-LINE in workshop ❗️
  // const attestedClaimStruct = JSON.parse('<attestedClaimJSONString>') //❗️ UNCOMMENT-LINE in workshop ❗️
  const attestedClaim = Kilt.AttestedClaim.fromAttestedClaim(
    attestedClaimStruct
  )

  await Kilt.default.connect(Kilt.BlockchainApiConnection.DEFAULT_WS_ADDRESS) // ❗️ REMOVE-LINE in workshop ❗️
  // await Kilt.default.connect('ws://full-nodes.devnet.kilt.io:9944') // ❗️ UNCOMMENT-LINE in workshop ❗️
  console.log(
    'Successfully connected to KILT devnet, verifying attested claim next...'
  )

  // 1. verify that the data is valid for the given CTYPE
  // 2. verify on-chain that the attestation hash is present and that the attestation has not been revoked
  const isValid = await attestedClaim.verify()
  console.log('Is the attested claim valid?', isValid)

  // disconnect from the chain
  await Kilt.default.disconnect(Kilt.BlockchainApiConnection.DEFAULT_WS_ADDRESS) // ❗️ REMOVE-LINE in workshop ❗️
  // await Kilt.default.disconnect('ws://full-nodes.devnet.kilt.io:9944') // ❗️ UNCOMMENT-LINE in workshop ❗️
  console.log('Disconnected from KILT devnet')
}

// execute calls
main()
/* 🚧 COPY_END for verifyClaim_example (above this comment) 🚧  */

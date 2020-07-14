/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
import * as Kilt from '../../index'

import setup from './setup'

/* 🚧 1️⃣ COPY_START for requestForAttestation_example (below this comment) 🚧  */
// const Kilt = require('@kiltprotocol/sdk-js') //❗️ UNCOMMENT-LINE in workshop ❗️

// async function main() { //❗️ UNCOMMENT-LINE in workshop ❗️
async function main(requestForAttestationStruct: Kilt.RequestForAttestation) {
  // use the attester mnemonic you've generated in the Identity step
  // const attester = await Kilt.Identity.buildFromMnemonic("<attesterMnemonic>"); //❗️ UNCOMMENT-LINE in workshop ❗️

  // const requestForAttestationStruct = JSON.parse("<requestForAttestationJSONString>"); //❗️ UNCOMMENT-LINE in workshop ❗️
  // @ts-ignore // ❗️ REMOVE-LINE in workshop ❗️
  const requestForAttestation = Kilt.RequestForAttestation.fromRequest(
    requestForAttestationStruct
  )
}

// execute calls
// main() // ❗️ UNCOMMENT-LINE in workshop ❗️
/* 🚧 1️⃣ COPY_END for requestForAttestation_example (above this comment) 🚧  */

async function attestationVerify(
  requestForAttestation: Kilt.RequestForAttestation
) {
  /* 🚧 2️⃣ COPY_START for attestationVerify_example (below this comment) 🚧  */
  const isDataValid = requestForAttestation.verifyData()
  const isSignatureValid = requestForAttestation.verifySignature()
  console.log('isDataValid: ', isDataValid)
  console.log('isSignatureValid: ', isSignatureValid)
  /* 🚧 2️⃣ COPY_END for attestationVerify_example (above this comment) 🚧  */
}

async function attestClaim(
  attester: Kilt.Identity,
  requestForAttestation: Kilt.RequestForAttestation
) {
  /* 🚧 3️⃣ COPY_START for attestClaim_example (below this comment) 🚧  */
  // build the attestation object
  const attestation = await Kilt.Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )

  // connect to the chain (this is one KILT devnet node)
  await Kilt.default.connect(Kilt.BlockchainApiConnection.DEFAULT_WS_ADDRESS) // ❗️ REMOVE-LINE in workshop ❗️
  // await Kilt.default.connect('ws://full-nodes.devnet.kilt.io:9944') // ❗️ UNCOMMENT-LINE in workshop ❗️
  console.log(
    'Successfully connected to KILT devnet, storing attestation next...'
  )

  // store the attestation on chain
  const submittableExtrinsic = await attestation.store(attester)
  if (submittableExtrinsic.isFinalized) {
    console.log('Attestation stored')
  }
  // the attestation was successfully stored on the chain, so you can now create the AttestedClaim object
  const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    attestation
  )
  // log the attestedClaim so you can copy/send it back to the claimer
  console.log('attestedClaimJSONString:\n', JSON.stringify(attestedClaim))

  // disconnect from the chain
  await Kilt.default.disconnect(Kilt.BlockchainApiConnection.DEFAULT_WS_ADDRESS) // ❗️ REMOVE-LINE in workshop ❗️
  // await Kilt.default.disconnect('ws://full-nodes.devnet.kilt.io:9944') // ❗️ UNCOMMENT-LINE in workshop ❗️
  console.log('Disconnected from KILT devnet')
  /* 🚧 3️⃣  COPY_END for attestClaim_example (above this comment) 🚧  */
  return attestedClaim
}

async function execution() {
  const {
    attester,
    requestForAttestation,
    requestForAttestationStruct,
  } = await setup()
  await main(requestForAttestationStruct)
  await attestationVerify(requestForAttestation)
  await attestClaim(attester, requestForAttestation)
}

execution()

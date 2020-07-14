/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as Kilt from '../../index'
import { nonce, attestedClaimJSONString, dataToVerifyJSONString } from './setup'

/* 🚧 1️⃣ COPY_START for signNonce_example (below this comment) 🚧  */
// const Kilt = require('@kiltprotocol/sdk-js') //❗️ UNCOMMENT-LINE in workshop ❗️

async function main() {
  const claimer = await Kilt.Identity.buildFromURI('//Bob') // ❗️ REMOVE-LINE in workshop ❗️
  // <nonce> = nonce received from the verifier = uuid you copied from above
  // const nonce = "<nonce>"; //❗️ UNCOMMENT-LINE in workshop ❗️

  // <claimerMnemonic> = claimer mnemonic generated in the Identity step
  // const claimer = await Kilt.Identity.buildFromMnemonic('claimerMnemonic'); //❗️ UNCOMMENT-LINE in workshop ❗️
  // sign the nonce as the claimer with your private identity
  const signedNonce = claimer.signStr(nonce)

  // same data as in to the simple "Verification" step
  // const attestedClaimStruct = JSON.parse("<attestedClaimJSONString>"); //❗️ UNCOMMENT-LINE in workshop ❗️
  const attestedClaimStruct = JSON.parse(attestedClaimJSONString) // ❗️ REMOVE-LINE in workshop ❗️

  const dataToVerify = {
    signedNonce,
    attestedClaimStruct,
  }

  console.log('attestedClaimStruct', attestedClaimStruct.request.claim.owner)
  console.log('dataToVerifyJSONString: ', JSON.stringify(dataToVerify))
}

// execute calls
main()
/* 🚧 1️⃣ COPY_END for signNonce_example (above this comment) 🚧  */

async function verifySignedNonce() {
  /* 🚧 2️⃣ COPY_START for verifyNonce_example (below this comment) 🚧  */
  // const Kilt = require("@kiltprotocol/sdk-js"); //❗️ UNCOMMENT-LINE in workshop ❗️

  // const { signedNonce, attestedClaimStruct } = JSON.parse("<dataToVerifyJSONString>"); //❗️ UNCOMMENT-LINE in workshop ❗️
  const { signedNonce, attestedClaimStruct } = JSON.parse(
    dataToVerifyJSONString
  ) // ❗️ REMOVE-LINE in workshop ❗️

  // verify the signed nonce (<nonce> is the uuid you've generated as the verifier)
  const isSenderOwner = Kilt.Crypto.verify(
    nonce,
    signedNonce,
    attestedClaimStruct.request.claim.owner
  )
  console.log('isSenderOwner: ', isSenderOwner)

  // proceed with verifying the attestedClaim itself
  // --> see simple "Verification" step in this tutorial
  /* 🚧 2️⃣ COPY_END for verifyNonce_example (above this comment) 🚧  */
  return isSenderOwner
}

if (!verifySignedNonce()) {
  throw new Error('Sender should have been owner')
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
import * as Kilt from '../../index'
import ctype from './2_ctypeFromSchema'

/* 🚧 1️⃣ COPY_START for claim_example (below this comment) 🚧  */
// const Kilt = require('@kiltprotocol/sdk-js') //❗️ UNCOMMENT-LINE in workshop ❗️

// import the claim type file we've created previously
// const ctype = require('./ctype.json') //❗️ UNCOMMENT-LINE in workshop ❗️

// wrap call inside async function
async function main() {
  // <claimerMnemonic> is for example 'gold upset segment cake universe carry demand comfort dawn invite element capital'
  // const mnemonic = "<claimerMnemonic>"; //❗️ UNCOMMENT-LINE in workshop ❗️
  const mnemonic = Kilt.Identity.generateMnemonic() // ❗️ REMOVE-LINE in workshop ❗️
  const claimer = await Kilt.Identity.buildFromMnemonic(mnemonic)

  const claimContents = {
    name: 'Alice',
    age: 25,
  }

  // @ts-ignore // ❗️ REMOVE-LINE in workshop ❗️
  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    claimContents,
    claimer.getAddress()
  )
}

// execute calls
main()
/* 🚧 1️⃣ COPY_END for claim_example (above this comment) 🚧 */

async function main2() {
  // <claimerMnemonic> is for example 'gold upset segment cake universe carry demand comfort dawn invite element capital'
  const mnemonic = Kilt.Identity.generateMnemonic()
  const claimer = await Kilt.Identity.buildFromMnemonic(mnemonic)

  const claimContents = {
    name: 'Alice',
    age: 25,
  }

  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    claimContents,
    claimer.getAddress()
  )
  /* 🚧 2️⃣ COPY_START for requestForAttestation_example (below this comment) 🚧 */
  const {
    message: requestForAttestation,
  } = await Kilt.RequestForAttestation.fromClaimAndIdentity(claim, claimer)

  // log this so you can paste it locally
  console.log(
    'requestForAttestationJSONString: ',
    JSON.stringify(requestForAttestation)
  )
  /* 🚧 2️⃣ COPY_END for requestForAttestation_example (above this comment) 🚧 */
}

main2()

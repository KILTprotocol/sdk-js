/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
import * as Kilt from '../../index'

/* 🚧 COPY_START for identity_example (below this comment) 🚧 */
// const Kilt = require('@kiltprotocol/sdk-js') //❗️ UNCOMMENT-LINE in workshop ❗️

// wrap call inside async function
async function main() {
  const mnemonic = Kilt.Identity.generateMnemonic()
  console.log('mnemonic:', mnemonic)

  const identity = await Kilt.Identity.buildFromMnemonic(mnemonic)
  console.log('address:', identity.getAddress())
}

// execute calls
main()
/* 🚧 COPY_END for identity_example (below this comment) 🚧 */

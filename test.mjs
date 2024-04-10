import { Keyring } from '@polkadot/api'
import * as sdk from '@kiltprotocol/sdk-js'

const api = await sdk.connect('wss://peregrine.kilt.io')

const kp = new Keyring({ ss58Format: 38 }).addFromUri('//Blob')
const kp2 = new Keyring({ ss58Format: 38 }).addFromUri('//Bluuurb')

const document = await api.derive.did.create(
  { authentication: kp2, assertionMethod: kp2, submitter: kp }
  //   (result) => {
  //     console.log(result.toHuman())
  //     if (result.isCompleted) {
  //       unsub.then(callMe => callMe())
  //       sdk.disconnect()
  //     }
  //   }
)

console.log(document)
sdk.disconnect()

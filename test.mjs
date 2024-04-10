import { Keyring } from '@polkadot/api'
import * as sdk from '@kiltprotocol/sdk-js'

const api = await sdk.connect('wss://peregrine.kilt.io')

const kp = new Keyring({ ss58Format: 38 }).addFromUri('//Blob')
const kp2 = new Keyring({ ss58Format: 38 }).addFromUri('//Blafrg')

const result = await api.derive.did.create(
  { authentication: kp2, assertionMethod: kp2, submitter: kp },
)

console.log(result)
sdk.disconnect()

# type-definitions

KILT's type definitions for Polkadot.js 

## Example usage

Depending on which chain you connect to, the spec name changes.
You can check the spec name using `api.runtimeVersion.specName`.
The polkadot.js API will select the correct types matching the spec name of the chain to the keys inside the `spec` object.


```js
const {
  typeBundleForPolkadot,
} = require('@kiltprotocol/type-definitions')
const { ApiPromise, WsProvider } = require('@polkadot/api')

const api = await ApiPromise.create({
    provider: new WsProvider('wss://peregrine.kilt.io'),
    typesBundle: {
        spec: {
            'mashnet-node': typeBundleForPolkadot,
            'kilt-spiritnet': typeBundleForPolkadot,
        },
    },
})

console.log(`Spec: ${api.runtimeVersion.specName.toString()}`)
```

## Print the last types configured

To print the latest type, run `yarn run print-latest-types` from the project root. It will print the types version + the types definition JSON.
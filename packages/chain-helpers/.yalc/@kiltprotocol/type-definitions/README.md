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

## Generate the type definitions

To generate the type definitions, run `yarn generate-types` from the project root. It will generate all the type definitions and save them in the `types` directory each with the name `types/types<min_version>-<max_version>.json`, for examples `types/types23-24.json`.

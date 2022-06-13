[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

[![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)](https://github.com/KILTprotocol/sdk-js/actions/workflows/tests.yml)
[![Compatible with latest dependencies](https://github.com/KILTprotocol/sdk-js/actions/workflows/tests-polkadot-deps.yml/badge.svg?event=schedule)](https://github.com/KILTprotocol/sdk-js/actions/workflows/tests-polkadot-deps.yml)

# KILT JavaScript / TypeScript SDK

The open-source KILT SDK is written in TypeScript and enables developers to quickly and easily build dApps around new business use cases.
KILT is a protocol for self-sovereign data and interoperability built on top of the permissionless KILT blockchain.
The SDK provides collection of classes and methods to interact with the KILT Protocol.

- **Self-sovereign data.** Have ownership of your digital and analog identities, with control over who your users share that data with. Providing that extra layer of flexibility and security.
- **Interoperability.** Claim Types (CTYPEs) facilitate the adoption of standardised credential content structures.

## Documentation

Head over to our [official website](https://kilt.io) or our [documentation hub](https://docs.kilt.io) to explore what KILT can offer to new and existing projects.

To help improve, please refer to our [contribution page](/docs/contribution-guide.md).

## How to install the SDK

Install the KILT-SDK by running the following commands:

```bash
npm install @kiltprotocol/sdk-js
```

or with `yarn`:

```bash
yarn add @kiltprotocol/sdk-js
```

## How to embed the bundle in HTML

We include UMD bundles in our release and prerelease NPM publishes.
They can be used to easily embed our complete SDK.

```html
<script src="https://unpkg.com/@kiltprotocol/sdk-js@dev/dist/sdk-js.min.umd.js"></script>
```

You can find the library on `window.kilt`, and use it completely dependency free.

## Job Board

Check to see if we have any [Job Offers](https://www.kilt.io/community/careers/)

## License

[License](/LICENSE)

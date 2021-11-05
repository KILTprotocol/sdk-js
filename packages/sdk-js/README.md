[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

Data sovereignty and interoperability

# Mash-Net SDK

The open-source KILT SDK is written in TypeScript and enables you to quickly and easily build dApps around new business use cases. KILT is a protocol for self-sovereign data and interoperability built on top of the permissionless KILT blockchain. The SDK provides collection of classes and methods you can utilize to interact with the KILT Protocol.

- **Self-sovereign data.** Have ownership of your digital and analog identities, with control over who your users share that data with. Providing that extra layer of flexiblity and security.
- **Interoperability.** Claim Types (CTYPEs) facilitate the adoption of standardised credential content structures.

To learn more, checkout the KILT [Whitepaper](https://kilt.io/wp-content/uploads/2019/05/KILT-Whitepaper-v2019-May-28.pdf) or see our [how it works](https://kilt.io/kilt-data-sovereignty-and-interoperability/) video.
Regarding the privacy enhancement, please have a look at our [lightning talk for Sub0 April 2020](https://drive.google.com/file/d/16HHPn1BA5o-W8QCeHfoTI1tNb5yQUZzt/view?usp=sharing).

## Documentation

> To avoid confusion between the latest released SDK version and the `develop` default branch, the links in the list **point to the master branch**, which always contains the latest official release of the SDK.

[KILT](https://kilt.io) documentation is provided in several guides and demos.

- [KILT workshop](https://github.com/KILTprotocol/kilt-workshop-101) 👈 Start here to get familiar with the basics
- [Getting started guide](https://github.com/KILTprotocol/sdk-js/blob/master/docs/getting-started.md) 👈 Start here if you'd like to include KILT in your project
- [KILT Developer overview](https://dev.kilt.io/) 👈 Checkout for an overview of the codebase, infrastructure and deployed KILT instances.
- [API documentation](https://kiltprotocol.github.io/sdk-js)
- [Demo client](https://kilt.io/developers-sub/kilt-demo-client/)
- [Demo client code](https://github.com/KILTprotocol/demo-client)

To help improve, please see our [contribution page](/docs/contribution-guide.md).

## How to install the SDK

Install the KILT-SDK by running the following commands:

```bash
npm install @kiltprotocol/sdk-js
```

Or with `yarn`:

```bash
yarn add @kiltprotocol/sdk-js
```

## Embed bundle in HTML

We include UMD bundles in our release and prerelease NPM publishes.
They can be used to easily embed our complete SDK.

```html
<script src="https://unpkg.com/@kiltprotocol/sdk-js@dev/dist/sdk-js.min.umd.js"></script>
```

You can find the library on `window.kilt`, and use it completely dependency free.

## Example

Please have a look at our examples within our [getting started guide](/docs/getting-started.md).

A claim type (CTYPE) can be a credential of any kind, e.g. a drivers license, a sports club membership or even a fairtrade certificate for chocolate.

Building a claim must be done by the defined CTYPE respective fields.
Now we can easily create the KILT compliant claim. We have to include the full CTYPE object, the raw claim object and the address of the owner/creator of the claim in the constructor:

```javascript
const rawClaim = {
    name: 'Alice',
    age: 29,
}

const claim = new Kilt.Claim(ctype, rawClaim, claimer)

Claim {
    cType:'0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
    contents: {
        name: 'Alice', age: 29 },
    owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz'
}
```

## Development Setup

[Development Setup](/docs/development-setup.md)

## Job Board

Check to see if we have any [Job Offers](https://kilt.io/job-offers/)

## License

[License](/LICENSE)

[![](https://user-images.githubusercontent.com/1248214/57789522-600fcc00-7739-11e9-86d9-73d7032f40fc.png)
](https://kilt.io)

Data sovereignty and interoperability

# Mash-Net SDK

The open-source KILT's SDK testnet is written in TypeScript and enables developers to build, play and design permissionless blockchain apps and businesses. [KILT](https://kilt.io) network provides a system for self-sovereign data and interoperability. The SDK provides collection of classes and methods developers can utilize to interact with the KILT Network.

- **Self-sovereign data.** Have ownership of your digital and analog identities, with control over who you share that data with. Providing that extra layer of flexiblity and security.

- **Interoperability.** The ability to search information freely between other blockchains.

To learn more from the KILT [Whitepaper](https://kilt.io/wp-content/uploads/2019/05/KILT-Whitepaper-v2019-May-28.pdf) or see our [how it works](https://kilt.io/kilt-data-sovereignty-and-interoperability/) video.

## Documentation

KILT documentation is provided in several guides and demos.

- [Quick start guide](./docs/quick-start-guide.md)
- [Getting started guide](./docs/getting-started.md)
- [API documentation](https://kiltprotocol.github.io/sdk-js/api)
- [KILT workshop](https://github.com/KILTprotocol/kilt-workshop-101)
- [Demo client](https://kilt.io/developers-sub/kilt-demo-client/)
- [Demo client code](https://github.com/KILTprotocol/demo-client)

To help improve, please see our [contribution page](./docs/contribution-guide.md).

## How to install the SDK

Install the KILT-SDK by running the following commands:

```bash

    npm init -y
    npm i @kiltprotocol/sdk-js

```

Or with `yarn`:

```bash

    yarn init -y
    yarn add @kiltprotocol/sdk-js

```

## Example

More examples can be found within our [getting started guide](./docs/getting-started.md).

A claim type (CTYPE) can be credentials, of any kind, e.g. drivers license.

Building a claim must be done by the defined CTYPE respective fields.

Now we can easily create the KILT compliant claim. We have to include the full CType object, the raw claim object and the address of the owner/creator of the claim in the contstructor:

```TypeScript

 const rawClaim = {
  name: 'Alice',
  age: 29,
  }

  const claim = new Kilt.Claim(ctype, rawClaim, claimer)

  Claim {
  cType:
   '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
  contents: { name: 'Alice', age: 29 },
  owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz' }

```

## Development Setup

[Development Setup](./docs/Contribution.md)

## Job Board

Check to see if we have any [Job Offers](https://kilt.io/job-offers/)

## License

[License](https://github.com/KILTprotocol/sdk-js/blob/develop/LICENSE)

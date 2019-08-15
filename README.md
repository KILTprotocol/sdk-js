[![](https://user-images.githubusercontent.com/1248214/57789522-600fcc00-7739-11e9-86d9-73d7032f40fc.png)
](https://kilt.io)

Data sovereignty and interoperability

# Mash-Net SDK

The open-source KILT's SDK testnet is written in TypeScript and enables developers to build, play and design permissionless blockchain apps and businesses. [KILT](https://kilt.io) network provides a system for self-sovereign data and interoperability. The SDK provides collection of classes and methods developers can utilize to interact with the KILT Network.

KILT enables the user to describe and attest any kind of characteristics of persons, organisations and even objects in a standardised way.

> _To learn more about the KILT protocol, we suggest further reading from the KILT [Whitepaper](https://kilt.io/wp-content/uploads/2019/05/KILT-Whitepaper-v2019-May-28.pdf) with more detailing of the System Architecture in chapter 7 or check out our [how it works](https://kilt.io/kilt-data-sovereignty-and-interoperability/) video_.

## Tutorials

Tutorials to get you started. Connect to the KILT Network try the [getting started guide](./docs/getting-started.md), or look to browse the [API documentation](https://kiltprotocol.github.io/sdk-js/api).

KILT offers a [workshop](https://github.com/KILTprotocol/kilt-workshop-101) tutorial for those interested in an introduction on how to use the SDK code.

Maybe you are looking for a place to test all features of the KILT Protocol? Try our [demo client](https://kilt.io/developers-sub/kilt-demo-client/), or you want to see what goes under the hood? Check out the [demo client code](https://github.com/KILTprotocol/demo-client)

## Installation

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

## Development setup

You can use different SDK branches or versions, by linking it into your projects locally.

Execute `yarn link` in the SDK and copy the command in the output, which should look like this:

`yarn link "@kiltprotocol/sdk-js"`

Go into your project folder and execute that second command.

The SDK is now symlinked in your projects `node_modules` folder

Before you see your changes from the SDK, you have to build it, by executing `yarn build`.

### Removing the link

Execute `yarn unlink "@kiltprotocol/sdk-js"` in the project folder.

After that execute `yarn install --check-files` to get the version from the registry back.

## Release / Deployment

Deployment is triggered by a push to the master branch as a result to a release build.

To build a release, start the release build job for the SDK in _AWS CodeBuild_. See [here](https://github.com/KILTprotocol/release-build-job/blob/master/README.md#usage) for more info on building releases.

As a result of a release build, a new version of the SDK is published to the NPM registry.

_Note: Don't forget to reference the correct version in the client and services_

## NB

Test coverage does not seem to be fail in all cases, except for testWatch.

## FAQ

### AWS build fails

If the sdk build fails on AWS, please check the error log. Usually it says

```

npm ERR! publish Failed PUT 403
npm ERR! code E403
npm ERR! You cannot publish over the previously published versions: 0.0.3. : @kiltprotocol/sdk-js

```

This is on purpose as a new push to master branch triggers a build, but should not automatically and unintended release a new version.

Please update package.json's version in order to publish a new version to the registry by AWS after pushing to master.

## Job Board

Check to see if we have any [Job Offers](https://kilt.io/job-offers/)

```

```

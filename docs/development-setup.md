# Development Setup

You can use different SDK branches or versions, by linking it into your projects locally.
In case you want to use the newest working changes, we recommend to use our `develop` branch.

## Link an unreleased version

Execute a `npm link` or `yarn link` within the SDK folder and copy the command in the output folder, which should look like this:

```
npm link "@kiltprotocol/sdk-js"
```

or with `yarn`

```
yarn link "@kiltprotocol/sdk-js"
```

Go into your project folder and execute that second command.
The SDK is now symlinked in your projects `node_modules` folder.

## Build to see changes

Note that **before you see your changes from the SDK, you have to build it**, by executing a `build`:

```
npm run build
```

or with `yarn`

```
yarn run build
```

## Removing the link

If you need to remove KILT from your project, execute the `unlink` command in the project folder.

```
npm unlink "@kiltprotocol/sdk-js"
```

or with `yarn`

```
yarn unlink "@kiltprotocol/sdk-js"
```

After that execute `install --check-files` to get the version from the registry back

```
npm install --check-files
```

or with `yarn`

```
yarn install --check-files
```

## Release / Deployment

A deployment is triggered by a push to the master branch as a result to a release build.

To build a release, start the release build job for the SDK in _AWS CodeBuild_. See [here](https://github.com/KILTprotocol/release-build-job/blob/master/README.md#usage) for more info on building releases.
As a result of a release build, a new version of the SDK is published to the NPM registry.

_Note: Don't forget to reference the correct version in the client and services_

### Dev releases

As of July 10th 2020 we automatically publish [develop releases on Github](https://github.com/KILTprotocol/sdk-js/packages/286306) on each push to the `develop` branch.
In order to use these, you need to set up an `.npmrc` file in your project root and add an Github Access Token with `read:packages` permission.

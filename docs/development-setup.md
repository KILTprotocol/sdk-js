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

### NPM

A new version of the SDK is automatically published to NPM when creating a Github release,
as well as prerelease versions on relevant changes of the develop branch.
We also include two (one minimized) UMD bundles of the complete sdk-js package in the dist folder.

### Github  [DEPRECATED]

From July 10th 2020 to November 27th 2020, we automatically published
[develop releases on Github](https://github.com/KILTprotocol/sdk-js/packages/286306)
on each push to the `develop` branch.
In order to use these, you need to set up an `.npmrc` file in your project root and add an Github Access Token with `read:packages` permission.

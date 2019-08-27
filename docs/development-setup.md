# Development Setup

You can use different SDK branches or versions, by linking it into your projects locally.

For more information

Execute a `npm link` or `yarn link` within the SDK folder and copy the command in the output folder, which should look like this:

```

    npm link "@kiltprotocol/sdk-js"

```

or with `yarn`

```

    yarn link "@kiltprotocol/sdk-js"

```

Go into your project folder and execute that second command.

The SDK is now symlinked in your projects `node_modules` folder

Before you see your changes from the SDK, you have to build it, by executing a `build`

```

    npm run build

```

or with `yarn`

```

    yarn run build

```

## Removing the link

If you need to remove KILT from your project

Execute `unlink` command in the project folder.

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

Deployment is triggered by a push to the master branch as a result to a release build.

To build a release, start the release build job for the SDK in _AWS CodeBuild_. See [here](https://github.com/KILTprotocol/release-build-job/blob/master/README.md#usage) for more info on building releases.

As a result of a release build, a new version of the SDK is published to the NPM registry.

_Note: Don't forget to reference the correct version in the client and services_

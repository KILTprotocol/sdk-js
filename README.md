# prototype-sdk

## How to access

Edit your `~/.npmrc` and insert/add kiltbot's auth token to the registry

e.g. //registry.npmjs.org/:_authToken=8...

Use within your project with `yarn add @kilt/prototype-sdk`

## Development setup

You can use different SDK branches or versions, by linking it into your projects.  

First build the SDK by executing `yarn build`.

After that, execute `yarn link` in the sdk and copy the command in the output, which should look like this: `yarn link "@kiltprotocol/prototype-sdk"`.  
Go into your project folder and execute that second command.

The SDK is now symlinked in your projects `node_modules` folder

## NB

Test coverage does not seem to be fail in all cases, except for testWatch.

## FAQ

### AWS build fails

If the prototype sdk build fails on AWS, please check the error log. Usually it says

```
npm ERR! publish Failed PUT 403
npm ERR! code E403
npm ERR! You cannot publish over the previously published versions: 0.0.3. : @kiltprotocol/prototype-sdk
```

This is on purpose as a new push to master branch triggers a build, but should not automatically and unintended release a new version.

Please update package.json's version in order to publish a new version to the registry by AWS after pushing to master.

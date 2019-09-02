# Contribution Guide

## NB

Test coverage does not seem to be fail in all cases, except for testWatch.

## AWS build fails

If the sdk build fails on AWS, please check the error log. Usually it says

```

    npm ERR! publish Failed PUT 403
    npm ERR! code E403
    npm ERR! You cannot publish over the previously published versions: 0.0.3. : @kiltprotocol/sdk-js

```

This is on purpose as a new push to master branch triggers a build, but should not automatically and unintended release a new version.

Please update package.json's version in order to publish a new version to the registry by AWS after pushing to master.

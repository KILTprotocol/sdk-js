[api]: https://kiltprotocol.github.io/sdk-js/api/index.html
[jsdoc]: https://www.npmjs.com/package/eslint-plugin-jsdoc
[typedoc]: https://github.com/TypeStrong/typedoc

# Contribution Guide

## Documentation

In the KILT SDK, podules and public methods are documented inline, in the code. The API doc is generated from these inline "doc blocks", and is available at our [online API Doc][api].

We're using [jsdoc][jsdoc] linting rules, along with [typedoc][typedoc] to generate the documentation.

### Documenting modules

Direct child folders of `src` such as `attestation` should be marked as `@modules`, so that they're listed in the [online API Doc][api] main menu.

Some of these modules are purely technical utilities, such as `crypto`. Others map to KILT concepts, such as `attestation`.

Both types of modules shall be documented with a short text in one of their child files (usually `X.ts` if the folder is called `x`):

* For technical modules, you're free to write this text as you like;
* For modules that map to a KILT concept, we recommend that you structure your text as follows:
  * Paragraph 1: Explanation of the overall concept, and the role it fulfills in the KILT Protocol;
  * Paragraph 2: Technical details of interest.

For reference, look for example at the doc block in `Attestation.ts`.

### Documenting public methods

Public methods should be documented. Some lint rules are set up: see the `jsdoc` rules in `eslintrc.json`, and [their description][jsdoc].

Additionally, we recommend you observe the following guidelines, to make the documentation as helpful as possible:

* Method description:
  * Make it concise and clear;
  * Start with a capitalized verb in the 3rd person;
  * If the method is async and/or static, add [ASYNC] and/or [STATIC] right before the description content.
* `@param` and `@returns` fields: don't add types, since this is automatically added into the API doc;
* Make sure you explain opaque abbreviations or jargon (example: TxStatus = transaction status);
* SDK Classes and methods should be linked when possible, using `[[]]`;
* `@example`:
  * Create it as valid, executable code;
  * Illustrate only this method's functionality, but also provide enough context for fellow developers to try it out:
    * Imports;
    * Preparation step;
    * Actual function call;
    * Expected output;
    * Suggestion for the next step.
  * Don't hesitate to include comments 😎.

Here is an example that follows these guidelines:

/**
[STATIC] [ASYNC] Revokes an attestation.

@param claimHash - The hash of the claim that corresponds to the attestation to revoke.
@param identity - The identity used to revoke the attestation. It should be an attester identity, or an identity with delegated rights.
@returns A promise containing the [[TxStatus]] (transaction status).
@example

```javascript
// To create `identity`, see `buildFromMnemonic` and `generateMnemonic` in the `Identity` class.
Attestation.revoke("0xd810224b1b6a4db8d1d1e909d1aeb7d441846914ed024cdc147c4fa9221cd177", identity);
```

**/

### Check locally how the [online API Doc][api] would look like

* Run `yarn build:docs` within the `sdk-js` folder. This generates the doc at `sdk-js/docs/api`.
* Open any of the generated files in your browser, such as `sdk-js/docs/api/classes/attestation.attestation-1.html`. You can now navigate.

Make sure you don't commit all these generated files.

## Tests

Test coverage does not seem to be fail in all cases, except for testWatch.

## AWS build fails

If the sdk build fails on AWS, please check the error log.

Usually it says:

```bash
    npm ERR! publish Failed PUT 403
    npm ERR! code E403
    npm ERR! You cannot publish over the previously published versions: 0.0.3. : @kiltprotocol/sdk-js
```

This is on purpose as a new push to master branch triggers a build, but should not automatically and unintended release a new version.

Please update package.json's version in order to publish a new version to the registry by AWS after pushing to master.

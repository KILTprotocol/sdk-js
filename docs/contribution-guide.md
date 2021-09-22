[apidoc]: https://kiltprotocol.github.io/sdk-js
[eslint-plugin-jsdoc]: https://www.npmjs.com/package/eslint-plugin-jsdoc
[typedoc]: https://github.com/TypeStrong/typedoc
[TSDoc]: https://github.com/microsoft/tsdoc

# Contribution Guide

## Documentation

We want the KILT SDK to be easy to use for all fellow developers. We ❤️ well-documented code.

KILT SDK's API doc is available [here][apidoc].

In the KILT SDK, modules and public methods are documented directly in the code via [TSDoc][TSDoc]. If you know JSDoc, TSDoc is a stricter and TS-compatible version of it.

Documentation is written in "docBlocks", special comments that document the code they precede. Docblocks start with `/**`.

Our docBlocks need to follow some linting rules. Make sure ESLint is activated in your code editor, so the errors and warnings are highlighted.
We also check these rules on commit and in our CI pipeline, so that you're protected: you can't push a linting error to the repo.
You don't need to - but if you're interested: you can see all the linting rules for the docBlocks in `.eslintrc.json`, and check what they mean on [eslint-plugin-jsdoc][eslint-plugin-jsdoc].

We're using [typedoc][typedoc] to generate the API doc from the docBlocks.

### Documenting modules

Direct child folders of `src` such as `attestation` should be marked as `@modules`, so that they're listed in the [online API Doc][apidoc] main menu.

Some of these modules are purely technical utilities, such as `crypto`. Others map to KILT concepts, such as `attestation`.

Both types of modules shall be documented with a short text in one of their child files (usually `X.ts` if the folder is called `x`):

* For technical modules, you're free to write this text as you like;
* For modules that map to a KILT concept, we recommend that you structure your text as follows:
  * Paragraph 1: Explanation of the overall concept, and the role it fulfills in the KILT Protocol;
  * Paragraph 2: Technical details of interest.

For reference, look for example at the docBlock at the beginning of `Attestation.ts`.

### Documenting public methods

Since they're available to SDK users, public methods must be documented.

On top of the the linting rules mentioned above (must document all parameters, must have a description...), we recommend that you observe the following guidelines to make the documentation as helpful as possible:

* Method description:
  * Make it concise and clear;
  * Start with a capitalized verb in the 3rd person;
  * If the method is async and/or static, add [ASYNC] and/or [STATIC] right before the description content.
* `@param` and `@returns` fields: don't add types, since this is automatically added into the API doc;
* Make sure you explain opaque abbreviations or jargon (example: TxStatus = transaction status);
* When referring to SDK Classes and methods, make sure you link them in, using `[[]]`;

💡The linting rules for the example snippet are **not** the same as the SDK codebase linting rules. For example, the example snippet should make use of semicolons. You can see the full ruleset in `.eslintrc-jsdoc.json`, but the linter should be enough to help you figure the rules out.

Example of a method docBlock that follows these guidelines:

```javascript
/**
  * [STATIC] Builds an identity object from a mnemonic string.
  *
  * @param phraseArg - [[BIP39]](https://www.npmjs.com/package/bip39) Mnemonic word phrase (Secret phrase).
  * @returns An [[Identity]].
  */
```

### Checking locally how the [online API Doc][apidoc] will look like

You probably don't need to do this. You can trust the doc will be rendered properly.
If you have a doubt:

* Run `yarn build:docs` within the `sdk-js` folder. This generates the doc at `sdk-js/docs/api`.
* Open any of the generated files in your browser, such as `sdk-js/docs/api/index.html`. You can now use the menu or inline links to navigate across modules and classes.

⚠️ Make sure you don't commit these generated files.

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

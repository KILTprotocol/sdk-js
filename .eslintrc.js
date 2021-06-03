module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
    'plugin:jsdoc/recommended',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier', 'jsdoc'],
  rules: {
    'import/no-cycle': 2,
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    // Taken care of by typescript
    'import/no-unresolved': 'off',
    'prettier/prettier': 'error',
    semi: ['error', 'never'],
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
      },
    ],
    '@typescript-eslint/prefer-interface': 'off',
    '@typescript-eslint/array-type': [
      'error',
      {
        default: 'array-simple',
      },
    ],
    '@typescript-eslint/ban-ts-comment' : 'warn',
    'jsdoc/require-description': 'warn',
    'jsdoc/require-description-complete-sentence': 'warn',
    'jsdoc/no-types': 'warn',
    'jsdoc/require-param-type': 'off',
    'jsdoc/require-returns-type': 'off',
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/check-examples': [
      'warn',
      {
        exampleCodeRegex:
          '^```(?:js|javascript|typescript)\\n([\\s\\S]*)```\\s*$',
        configFile: '.eslintrc-jsdoc.json',
      },
    ],
    'jsdoc/check-tag-names': [
      'warn',
      {
        definedTags: ['preferred', 'packageDocumentation'],
      },
    ],
    'jsdoc/check-alignment': 'off',
  },
  overrides: [
    {
      files: ['**/*.spec.ts', '**/*.spec.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-underscore-dangle': 'off',
        'global-require': 'off',
        'jsdoc/check-tag-names': [
          'warn',
          {
            definedTags: ['group', 'packageDocumentation'],
          },
        ],
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
}

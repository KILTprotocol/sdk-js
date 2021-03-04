module.exports = {
  exclude: [
    '**/*spec.ts',
    '**/__mocks__/**',
    '**/testingTools/**',
    '**/*.js',
    '**/node_modules/**',
  ],
  excludeProtected: true,
  excludePrivate: true,
  stripInternal: true,
  hideGenerator: true,
  name: '@kiltprotocol/sdk-js',
  listInvalidSymbolLinks: true,
  tsconfig: 'tsconfig.json',
  readme: 'README.md',
}

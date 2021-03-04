module.exports = {
  exclude: [
    '**/*spec.ts',
    '**/__mocks__/**',
    '**/testingTools/**',
    '**/*.js',
    '**/node_modules/**',
    '**/__integrationtests__/**'
  ],
  excludeExternals: false,
  excludeNotExported: true,
  excludePrivate: true,
  hideGenerator: true,
  stripInternal: true,
  excludeProtected: true,
  name: '@kiltprotocol/sdk-js',
  listInvalidSymbolLinks: true,
  tsconfig: 'tsconfig.json',
  readme: 'README.md',
}

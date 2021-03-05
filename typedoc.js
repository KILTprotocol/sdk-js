module.exports = {
  exclude: [
    '**/*spec.ts',
    '**/__mocks__/**',
    '**/testingTools/**',
    '**/*.js',
    '**/node_modules/**',
    '**/__integrationtests__/**',
    '**/index.ts'
  ],
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  stripInternal: true,
  hideGenerator: true,
  name: '@kiltprotocol/sdk-js',
  listInvalidSymbolLinks: true,
  tsconfig: 'tsconfig.json',
  readme: 'README.md',
}

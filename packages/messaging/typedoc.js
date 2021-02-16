module.exports = {
  exclude: ['**/*spec.ts', 'index.ts'],
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  hideGenerator: true,
  listInvalidSymbolLinks: true,
  tsconfig: 'tsconfig.build.json',
  readme: 'README.md',
}

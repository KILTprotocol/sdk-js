module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  clearMocks: true,
  runner: 'groups',
  // Parachain block time is 12s
  testTimeout: 15000,
  setupFilesAfterEnv: ['../jest-setup/setup.js'],
  transformIgnorePatterns: ['/node_modules/(?!@polkadot|@babel/runtime/helpers/esm/)'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    '**/*/src/**/*.ts',
    '!**/index.ts',
    '!**/__integrationtests__/**',
    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/lib/**',
    '!**/test/**',
    '!**/kilt/*',
    '!**/blockchainApiConnection/*',
    '!**/types/**/*',
    '!**/SDKErrors.ts',
    '!utils/src/json-schema/*',
    '!testing/**',
    // TODO: write tests for these files and remove here
    '!**/*.chain.ts',
    '!did/src/index.types.ts',
    '!did/src/Did.chain.ts',
    '!did/src/Did.utils.ts',
    '!did/src/DemoKeystore/DemoKeystore.ts',
    '!did/src/DemoKeystore/DemoKeystore.utils.ts',
    '!did/src/DidDetails/DidDetails.utils.ts',
    '!did/src/DidDetails/LightDidDetails.utils.ts',
    '!did/src/DidDetails/FullDidDetails.utils.ts',
    '!did/src/DidBatcher/DidBatchBuilder.utils.ts',
    '!did/src/DidBatcher/FullDidBuilder.utils.ts',
    '!did/src/DidBatcher/FullDidCreationBuilder.utils.ts',
    '!did/src/DidBatcher/FullDidUpdateBuilder.utils.ts',
  ],
  resolver: "ts-jest-resolver",
  rootDir: 'packages',
  coverageDirectory: 'coverage',
  moduleDirectories: [
    "node_modules",
    "packages/*/src"
  ]
}

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
    '!augment-api/**',
    // TODO: write tests for these files and remove here
    '!**/*.chain.ts',
    '!did/src/Did.chain.ts',
    '!did/src/Did.utils.ts',
    '!did/src/DidDetails/LightDidDetails.utils.ts',
    '!did/src/DidDetails/FullDidDetails.utils.ts',
    '!utils/src/jsonabc.ts',
  ],
  resolver: "ts-jest-resolver",
  rootDir: 'packages',
  coverageDirectory: 'coverage',
  moduleDirectories: [
    "node_modules",
    "packages/*/src"
  ]
}

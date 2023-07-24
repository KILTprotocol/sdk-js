module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  runner: 'groups',
  testTimeout: 5000,
  setupFilesAfterEnv: ['<rootDir>/jest-setup/setup.js'],
  transformIgnorePatterns: ['/node_modules/(?!@digitalbazaar|base.+-universal|crypto-ld)'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    "\\.js$": ["babel-jest", { root: './' }],
    "\\.ts$": "ts-jest"
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
    '!**/types/**/*',
    '!**/SDKErrors.ts',
    '!utils/src/json-schema/*',
    '!testing/**',
    '!augment-api/**',
    '!type-definitions/**',
    '!**/*.chain.ts',
    '!did/src/Did.chain.ts',
    '!did/src/Did.rpc.ts',
    '!did/src/Did.utils.ts',
    '!utils/src/jsonabc.ts',
    '!core/src/utils.ts',
  ],
  resolver: "ts-jest-resolver",
  roots: ['<rootDir>/packages', '<rootDir>/tests/breakingChanges'],
  coverageDirectory: 'coverage',
  moduleDirectories: [
    "node_modules",
    "packages/*/src"
  ]
}

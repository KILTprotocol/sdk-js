module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  runner: 'groups',
  testTimeout: 10000,
  setupFilesAfterEnv: ['../testingTools/setup.ts'],
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
    '!**/SDKErrors.ts'
  ],
  rootDir: 'packages',
  coverageDirectory: 'coverage',
  moduleDirectories: [
    "node_modules",
    "packages/*/src"
  ]
}

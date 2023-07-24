const common = {
  testEnvironment: 'node',
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/jest-setup/setup.js'],
  transformIgnorePatterns: ['/node_modules/(?!@digitalbazaar|base.+-universal|crypto-ld)'],
  transform: {
    "\\.js$": ["babel-jest", { root: './' }],
    "\\.ts$": "ts-jest"
  },
  resolver: "ts-jest-resolver",
  moduleDirectories: [
    "node_modules",
    "packages/*/src"
  ]
}

module.exports = {
  testTimeout: 5000,
  projects: [
    {
      ...common,
      displayName: 'unit',
      roots: ['<rootDir>/packages'],
      coverageDirectory: 'coverage',
      coverageThreshold: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      collectCoverageFrom: [
        'packages/*/src/**/*.ts',
        '!**/index.ts',
        '!**/kilt/*',
        '!**/SDKErrors.ts',
        '!**/*.chain.ts',
        '!packages/types/**/*',
        '!packages/utils/src/json-schema/*',
        '!packages/augment-api/**',
        '!packages/type-definitions/**',
        '!packages/did/src/Did.chain.ts',
        '!packages/did/src/Did.rpc.ts',
        '!packages/did/src/Did.utils.ts',
        '!packages/utils/src/jsonabc.ts',
        '!packages/core/src/utils.ts',
      ],    
    },
    {
      ...common,
      displayName: 'breaking',
      roots: ['<rootDir>/tests/breakingChanges'],
    },
  ]
}
const common = {
  testEnvironment: 'node',
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  transformIgnorePatterns: ['/node_modules/(?!@digitalbazaar|base.+-universal|crypto-ld)'],
  transform: {
    "\\.js$": ["babel-jest", { root: './' }],
    "\\.ts$": "ts-jest"
  },
  resolver: "ts-jest-resolver",
  moduleDirectories: [
    "node_modules",
    "packages/*/src"
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  collectCoverageFrom: [
    'packages/*/src/**',
  ],
  coveragePathIgnorePatterns: [
    // test and library code
    '/node_modules/',
    '/lib/',
    '/tests/',
    // not properly testable
    'packages/types/',
    'packages/augment-api/',
    'packages/type-definitions/',
    'packages/core/src/kilt/',
    'index.ts',
    'types.ts',
    '.chain.ts',
    'DelegationDecoder.ts',
    'SDKErrors.ts',
    'Did.rpc.ts',
    // third party code copied to this repo
    'packages/utils/src/json-schema/',
    'jsonabc.ts',
  ],
}

module.exports = {
  ...common,
  testTimeout: 5000,
  projects: [
    {
      ...common,
      displayName: 'unit',
      roots: ['<rootDir>/packages'],
    },
    {
      ...common,
      displayName: 'breaking',
      roots: ['<rootDir>/tests/breakingChanges'],
    },
  ]
}

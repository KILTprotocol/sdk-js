const common = {
  testEnvironment: 'node',
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/jest-setup.js'],
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
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'packages/*/src/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/tests/',
    'packages/types/',
    'packages/augment-api/',
    'packages/type-definitions/',
    'packages/utils/src/json-schema/',
    'packages/core/src/kilt/',
    'index.ts',
    'types.ts',
    '.chain.ts',
    'SDKErrors.ts',
    'Did.chain.ts',
    'Did.rpc.ts',
    'Did.utils.ts',
    'jsonabc.ts',
    'packages/core/src/utils.ts',
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
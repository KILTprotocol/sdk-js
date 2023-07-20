module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  // Parachain block time is 12s
  testTimeout: 30000,
  maxWorkers: 3,
  testPathIgnorePatterns: ['dist'],
  transformIgnorePatterns: ['/node_modules/(?!@digitalbazaar|base.+-universal|crypto-ld)'],
  transform: {
    "\\.js$": "babel-jest",
    "\\.ts$": "ts-jest"
  },
  resolver: "ts-jest-resolver",
  rootDir: 'tests/integration',
  coverageDirectory: 'coverage',
  moduleDirectories: [
    "node_modules",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    " packages/testing",
    "packages/type-definitions",
    "packages/types",
    "packages/augment-api"
  ]
}

module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  // Parachain block time is 12s
  testTimeout: 30000,
  maxWorkers: 3,
  rootDir: 'tests/integration/dist',
  transform: {},
  coverageDirectory: 'coverage',
  moduleDirectories: [
    "node_modules",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "packages/testing",
    "packages/type-definitions",
    "packages/types",
    "packages/augment-api"
  ]
}

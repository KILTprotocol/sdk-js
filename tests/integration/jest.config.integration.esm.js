module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  // Parachain block time is 12s
  testTimeout: 120_000,
  maxWorkers: 3,
  roots: ['dist'],
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

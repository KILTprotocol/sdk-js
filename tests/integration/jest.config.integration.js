module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  // Parachain block time is 12s
  testTimeout: 120_000,
  maxWorkers: 3,
  testPathIgnorePatterns: ["dist"],
  resolver: "ts-jest-resolver",
  moduleDirectories: [
    "node_modules",
  ],
}

module.exports = {
  testEnvironment: "node",
  clearMocks: true,
  // Parachain block time is 12s
  testTimeout: 120_000,
  maxWorkers: 3,
  roots: ["dist"],
  transform: {},
  moduleDirectories: [
    "node_modules",
  ],
}

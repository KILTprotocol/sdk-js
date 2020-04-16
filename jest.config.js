module.exports = {
  preset: 'ts-jest',
  testEnvironment: '../jest.env.js',
  clearMocks: true,
  runner: 'groups',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/blockchain/**/*.ts',
    '!index.ts',
    '!**/__integrationtests__/*.ts',
  ],
  rootDir: 'src',
  coverageDirectory: '../coverage',
  globalTeardown: './__integrationtests__/jest.teardown.js',
}

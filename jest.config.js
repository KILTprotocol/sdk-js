module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom : [
      '**/*.ts',
      '!**/blockchain/**/*.ts',
      '!index.ts'
  ],
  rootDir: 'src'
}
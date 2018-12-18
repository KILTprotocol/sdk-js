module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/blockchain/': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  rootDir: 'src'
}
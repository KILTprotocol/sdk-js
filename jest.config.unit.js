var config = require('./jest.config')
config.testPathIgnorePatterns = ['/node_modules/', '/__integrationtests__/']
console.log('RUNNING UNIT TESTS')
module.exports = config

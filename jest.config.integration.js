var config = require('./jest.config')
config.testMatch = ['**/__integrationtests__/**/*.spec.[jt]s?(x)'] //Overriding testMatch option
console.log('RUNNING INTEGRATION TESTS')
module.exports = config

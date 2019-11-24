var config = require('./jest.config')
config.testMatch = [ "**/?(*.)+(intspec|integration).[jt]s?(x)" ] //Overriding testMatch option
console.log('RUNNING INTEGRATION TESTS')
module.exports = config

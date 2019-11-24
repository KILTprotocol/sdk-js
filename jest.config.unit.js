var config = require('./jest.config')
config.testMatch = [ "**/?(*.)+(spec|test).[jt]s?(x)" ] //Overriding testMatch option. Equal to default
console.log('RUNNING UNIT TESTS')
module.exports = config

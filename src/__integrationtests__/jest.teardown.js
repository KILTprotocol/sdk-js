const { getCached } = require('../blockchainApiConnection')

module.exports = function teardown() {
  return getCached().then((bc) => bc.api.disconnect())
}

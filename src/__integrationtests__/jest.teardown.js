// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCached } = require('../blockchainApiConnection')

module.exports = function teardown() {
  return getCached()
    .then((bc) => bc.api.disconnect())
    .finally(process.exit())
}

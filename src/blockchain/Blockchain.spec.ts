import Identity from '../identity/Identity'
import Blockchain from './Blockchain'

// NB: see jst.config.js - include this dir to be tested for test coverage again

describe('Blockchain', () => {
  xit('should hash ctype', async () => {
    const api = await Blockchain.connect()
    const identity = new Identity()
    const hash = await Blockchain.ctypeHash(api, identity, 'hello world')
    console.log(hash)
  }, 10000)
})

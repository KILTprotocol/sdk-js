import { ApiPromise } from '@polkadot/api'
import { Header } from '@polkadot/types'
import BN from 'bn.js/'
import partial from 'lodash/partial'
import Identity from '../identity/Identity'
import Blockchain from './Blockchain'
// NB: see jest.config.js - include this dir to be tested for test coverage again
// to acquire a connection as singleton, async and without jest complaining about
// 'Jest: Coverage data for ./src/blockchain/ was not found.' I use this construct for now
let apiSingleton: ApiPromise
const getConnectionOnce = async () => {
  if (!apiSingleton) {
    apiSingleton = await Blockchain.connect()
  }
  return apiSingleton
}

describe('Blockchain', async () => {
  xit('should get stats', async () => {
    const api = await getConnectionOnce()
    const stats = await partial(Blockchain.getStats, api)()
    expect(stats).toEqual({
      chain: 'KILT Testnet',
      nodeName: 'substrate-node',
      nodeVersion: '0.9.0',
    })
  })

  xit('should listen to blocks', async done => {
    const api = await getConnectionOnce()

    const listener = (header: Header) => {
      console.log(`Best block number ${header.blockNumber}`)
      done()
    }

    const subscriptionId = await partial(Blockchain.listenToBlocks, api)(
      listener
    )
    expect(subscriptionId).toBeGreaterThanOrEqual(0)
    console.log(`Subscription Id: ${subscriptionId}`)
  }, 20000)

  xit('should listen to balance changes', async done => {
    const api = await getConnectionOnce()
    const bob = Identity.buildFromSeedString('Bob')
    const listener = (account: string, balance: BN, change: BN) => {
      console.log({ account, balance, change })
      done()
    }

    const currentBalance = await partial(
      Blockchain.listenToBalanceChanges,
      api
    )(bob.address, listener)

    expect(currentBalance.toString()).toBeTruthy()
    expect(currentBalance.toString()).not.toEqual('0')
  }, 50000)

  xit('should make transfer', async () => {
    const api = await getConnectionOnce()
    const alice = Identity.buildFromSeedString('Alice')
    const bob = Identity.buildFromSeedString('Bob')

    const hash = await partial(Blockchain.makeTransfer, api)(
      alice,
      bob.address,
      100
    )
    console.log({ hash })
  }, 10000)
})

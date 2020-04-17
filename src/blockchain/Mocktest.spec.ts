import BN from 'bn.js'
import { Tuple, Option, U8a, Text } from '@polkadot/types'
import { Identity } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'
import { queryByAddress } from '../did/Did.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('tx mocks', () => {
  it('tx succeeds', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
      true
    )
    const alice = Identity.buildFromURI('//Alice')
    const amount = new BN(1000)
    const blockchain = await getCached()
    const transfer = blockchain.api.tx.balances.transfer(alice.address, amount)
    const result = await blockchain.submitTx(alice, transfer)
    expect(result).toMatchObject({ isFinalized: true })
  })

  it('tx succeeds then fails', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__queueResults(
      [true, false]
    )
    const alice = Identity.buildFromURI('//Alice')
    const amount = new BN(1000)
    await expect(
      makeTransfer(alice, alice.address, amount)
    ).resolves.toMatchObject({
      isFinalized: true,
    })
    await expect(makeTransfer(alice, alice.address, amount)).rejects.toThrow(
      'Transaction failed'
    )
  })
})

describe('mock query result', () => {
  beforeAll(async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.did.dIDs.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          // (publicBoxKey, publicSigningKey, documentStore?)
          [Text, Text, U8a],
          ['0x987', '0x123', '0x687474703a2f2f6d794449442e6b696c742e696f']
        )
      )
    )
    // would also work:
    // ```ts
    // const bc: any = await getCached()
    // bc.api.query.did.dIDs.mockReturnValue(...)
    // ```
  })

  it('works', async () => {
    await expect(queryByAddress('0xwertzui')).resolves.toMatchObject({
      documentStore: 'http://myDID.kilt.io',
      identifier: 'did:kilt:0xwertzui',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
    })
  })
})

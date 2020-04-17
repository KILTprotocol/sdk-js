import BN from 'bn.js'
import { Tuple, Option, U8a, Text } from '@polkadot/types'
import { stringToHex } from '@polkadot/util'
import { Identity } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'
import { queryByAddress } from '../did/Did.chain'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('tx mocks', () => {
  const alice = Identity.buildFromURI('//Alice')
  const amount = new BN(1000)
  it('tx succeeds', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
      true
    )
    const blockchain = await getCached()
    const transfer = blockchain.api.tx.balances.transfer(alice.address, amount)
    const result = await blockchain.submitTx(alice, transfer)
    expect(result).toMatchObject({ isFinalized: true })
  })
  it('tx fails', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
      false
    )
    await expect(makeTransfer(alice, alice.address, amount)).rejects.toThrow(
      'Transaction failed'
    )
  })

  it('tx succeeds then fails', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__queueResults(
      [true, false]
    )
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
  describe('DID', () => {
    const documentStore = 'http://myDID.kilt.io'
    const identifier = 'did:kilt:0xwertzui'

    it('works for default DID mock', async () => {
      const [publicBoxKey, publicSigningKey] = [
        'publicBoxKey',
        'publicSigningKey',
      ]
      await getCached()
      await expect(queryByAddress('0xwertzui')).resolves.toMatchObject({
        documentStore,
        identifier,
        publicBoxKey,
        publicSigningKey,
      })
    })
    it('works for custom DID mock', async () => {
      const [publicBoxKey, publicSigningKey] = ['0x123', '0x321']
      require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.did.dIDs.mockReturnValue(
        new Option(
          Tuple,
          new Tuple(
            // (publicSigningKey, publicBoxKey, documentStore?)
            [Text, Text, U8a],
            [publicSigningKey, publicBoxKey, stringToHex(documentStore)]
          )
        )
      )
      await expect(queryByAddress('0xwertzui')).resolves.toMatchObject({
        documentStore,
        identifier,
        publicBoxKey,
        publicSigningKey,
      })
    })
  })
})

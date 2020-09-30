/**
 * @packageDocumentation
 * @group integration/errorhandler
 * @ignore
 */

import BN from 'bn.js'
import { Attestation, IBlockchainApi } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import { AWAIT_IN_BLOCK, submitSignedTx } from '../blockchain/Blockchain'
import { DEFAULT_WS_ADDRESS, getCached } from '../blockchainApiConnection'
import { ERROR_CTYPE_NOT_FOUND } from '../errorhandling'
import Identity from '../identity'

let blockchain: IBlockchainApi | undefined
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

xit('records an extrinsic error when transferring less than the existential amount', async () => {
  const from = await Identity.buildFromURI('//Alice')
  const to = await Identity.buildFromMnemonic('')
  await expect(makeTransfer(from, to.address, new BN(1))).rejects.toThrow()
})

it('records an extrinsic error when ctype does not exist', async () => {
  const attester = await Identity.buildFromURI('//Alice')
  const attestation = Attestation.fromAttestation({
    claimHash:
      '0xfea1357cdba9982ebe7a8a3bb2db975cbb7424acd503d4dc3a7339778e8bb752',
    cTypeHash:
      '0x103752ecd8e284b1c9677337ccc91ea255ac8e6651dc65d90f0504f31d7e54f0',
    delegationId: null,
    owner: attester.address,
    revoked: false,
  })
  const tx = await attestation.store(attester)
  await expect(submitSignedTx(tx, AWAIT_IN_BLOCK)).rejects.toThrow(
    ERROR_CTYPE_NOT_FOUND
  )
}, 40_000)

afterAll(() => {
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})

/**
 * @packageDocumentation
 * @group integration/errorhandler
 * @ignore
 */

import BN from 'bn.js'
import { BlockchainUtils, ExtrinsicErrors } from '@kiltprotocol/chain-helpers'
import { Attestation } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import Identity from '../identity'
import { config, disconnect } from '../kilt'
import { WS_ADDRESS } from './utils'

import '../../../../testingTools/jestErrorCodeMatcher'

let alice: Identity

beforeAll(async () => {
  config({ address: WS_ADDRESS })
  alice = Identity.buildFromURI('//Alice')
})

it('records an unknown extrinsic error when transferring less than the existential amount to new identity', async () => {
  const to = Identity.buildFromMnemonic('')
  await expect(
    makeTransfer(alice, to.address, new BN(1)).then((tx) =>
      BlockchainUtils.submitTxWithReSign(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    )
  ).rejects.toThrowErrorWithCode(ExtrinsicErrors.UNKNOWN_ERROR.code)
}, 30_000)

it('records an extrinsic error when ctype does not exist', async () => {
  const attestation = Attestation.fromAttestation({
    claimHash:
      '0xfea1357cdba9982ebe7a8a3bb2db975cbb7424acd503d4dc3a7339778e8bb752',
    cTypeHash:
      '0x103752ecd8e284b1c9677337ccc91ea255ac8e6651dc65d90f0504f31d7e54f0',
    delegationId: null,
    owner: alice.address,
    revoked: false,
  })
  const tx = await attestation.store(alice)
  await expect(
    BlockchainUtils.submitTxWithReSign(tx, alice, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).rejects.toThrowErrorWithCode(
    ExtrinsicErrors.CType.ERROR_CTYPE_NOT_FOUND.code
  )
}, 30_000)

afterAll(() => {
  disconnect()
})

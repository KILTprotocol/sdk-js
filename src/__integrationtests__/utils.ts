/* eslint-disable */

import BN from 'bn.js/'
import TxStatus from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import { getBalance, makeTransfer } from '../balance/Balance.chain'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { getOwner } from '../ctype/CType.chain'

export const GAS = new BN(1000000)
export const MIN_TRANSACTION = new BN(100000000)
export const ENDOWMENT = MIN_TRANSACTION.mul(new BN(100))

export async function transferTokens(
  from: Identity,
  to: Identity,
  amount: BN
): Promise<TxStatus> {
  const [balanceFrom, balanceTo] = await Promise.all([
    getBalance(from.address),
    getBalance(to.address),
  ])
  expect(balanceFrom.gte(amount.add(GAS))).toBeTruthy()
  const status = await makeTransfer(from, to.address, amount)
  const [newBalanceFrom, newBalanceTo] = await Promise.all([
    getBalance(from.address),
    getBalance(to.address),
  ])
  expect(newBalanceTo.sub(balanceTo).eq(amount)).toBeTruthy()
  expect(balanceFrom.sub(newBalanceFrom).eq(amount.add(GAS))).toBeTruthy()
  console.log(
    `Successfully transferred ${amount.toNumber()} from ${from.address} to ${
      to.address
    }`
  )
  return status
}

export function NewIdentity(): Identity {
  return Identity.buildFromMnemonic(Identity.generateMnemonic())
}

// Dev Faucet account seed phrase
const FaucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
export const faucet = Identity.buildFromMnemonic(FaucetSeed)
export const alice = Identity.buildFromURI('//Alice')
export const bob = Identity.buildFromURI('//Bob')

export async function endow(receiver: Identity) {
  const balance = await getBalance(receiver.address)
  if (balance.eq(new BN(0))) {
    await makeTransfer(faucet, receiver.address, ENDOWMENT)
  }
  return receiver
}

export async function CtypeOnChain(ctype: CType): Promise<boolean> {
  return getOwner(ctype.hash)
    .then(ownerAddress => {
      console.log(ownerAddress)
      return ownerAddress !== null
    })
    .catch(() => false)
}

export const DriversLicense = CType.fromCType({
  schema: {
    $id: 'DriversLicense',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'integer',
      },
    },
    type: 'object',
  } as ICType['schema'],
} as ICType)

export const IsOfficialLicenseAuthority = CType.fromCType({
  schema: {
    $id: 'LicenseAuthority',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      LicenseType: {
        type: 'string',
      },
      LicenseSubtypes: {
        type: 'string',
      },
    },
    type: 'object',
  } as ICType['schema'],
} as ICType)

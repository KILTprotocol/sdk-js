/* eslint-disable */

import Keyring from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { randomAsU8a } from '@polkadot/util-crypto'
import { BN } from '@polkadot/util'
import CType from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
export const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(100)

export const WS_ADDRESS = 'ws://127.0.0.1:9944'
// Dev Faucet account seed phrase
export const FaucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'

const keyring: Keyring = new Keyring({ ss58Format: 38, type: 'ed25519' })

// endowed accounts on development chain spec
// ids are ed25519 because the endowed accounts are
export const devFaucet = keyring.createFromUri(FaucetSeed)
export const devAlice = keyring.createFromUri('//Alice')
export const devBob = keyring.createFromUri('//Bob')
export const devCharlie = keyring.createFromUri('//Charlie')

export function addressFromRandom(): string {
  return keyring.encodeAddress(randomAsU8a(32))
}

export function keypairFromRandom(): KeyringPair {
  return keyring.addFromSeed(randomAsU8a(32))
}

export async function CtypeOnChain(ctype: CType): Promise<boolean> {
  return getOwner(ctype.hash)
    .then((ownerAddress) => {
      return ownerAddress !== null
    })
    .catch(() => false)
}

export const DriversLicense = CType.fromSchema({
  $id: 'kilt:ctype:0x1',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'Drivers License',
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
  },
  type: 'object',
})

export const IsOfficialLicenseAuthority = CType.fromSchema({
  $id: 'kilt:ctype:0x2',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'License Authority',
  properties: {
    LicenseType: {
      type: 'string',
    },
    LicenseSubtypes: {
      type: 'string',
    },
  },
  type: 'object',
})

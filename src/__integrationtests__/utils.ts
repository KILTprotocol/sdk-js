/**
 * @ignore
 * @packageDocumentation
 */
/* eslint-disable */

import BN from 'bn.js/'
import Identity from '../identity/Identity'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { getOwner } from '../ctype/CType.chain'

export const GAS = new BN(1000000)
export const MIN_TRANSACTION = new BN(100000000)
export const ENDOWMENT = MIN_TRANSACTION.mul(new BN(100))

// Dev Faucet account seed phrase
const FaucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'

export const wannabeFaucet = Identity.buildFromMnemonic(FaucetSeed)
export const wannabeAlice = Identity.buildFromURI('//Alice')
export const wannabeBob = Identity.buildFromURI('//Bob')

export async function CtypeOnChain(ctype: CType): Promise<boolean> {
  return getOwner(ctype.hash)
    .then(ownerAddress => {
      return ownerAddress !== null
    })
    .catch(() => false)
}

export const DriversLicense = CType.fromSchema({
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
} as ICType['schema'])

export const IsOfficialLicenseAuthority = CType.fromSchema({
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
} as ICType['schema'])

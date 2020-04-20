/**
 * @hidden
 * @packageDocumentation
 */
import BN from 'bn.js/'
import Identity from '../identity/Identity'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { getOwner } from '../ctype/CType.chain'

export const GAS = new BN(1_000_000)
export const MIN_TRANSACTION = new BN(100_000_000)
export const ENDOWMENT = MIN_TRANSACTION.mul(new BN(100))

export async function NewIdentity(): Promise<Identity> {
  return Identity.buildFromMnemonic(Identity.generateMnemonic())
}

// Dev Faucet account seed phrase
const FaucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'

export async function buildIdentities(): Promise<{
  faucet: Identity
  alice: Identity
  bob: Identity
}> {
  const faucet = await Identity.buildFromURI(FaucetSeed)
  const alice = await Identity.buildFromURI('//Alice')
  const bob = await Identity.buildFromURI('//Bob')

  return {
    faucet,
    alice,
    bob,
  }
}

export async function CtypeOnChain(ctype: CType): Promise<boolean> {
  return getOwner(ctype.hash)
    .then((ownerAddress) => {
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

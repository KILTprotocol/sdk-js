/* eslint-disable */

import { KeyringPair } from '@polkadot/keyring/types'
import { BN, hexToU8a } from '@polkadot/util'
import Attestation from '../attestation/Attestation'
import { Keyring } from '@kiltprotocol/utils'
import { randomAsU8a } from '@polkadot/util-crypto'
import CType from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'
import {
  DefaultResolver,
  DemoKeystore,
  DidChain,
  DidUtils,
  FullDidDetails,
  LightDidDetails,
} from '@kiltprotocol/did'
import { Balance } from '../balance'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import {
  IRequestForAttestation,
  KeyRelationship,
  KeystoreSigner,
} from '@kiltprotocol/types'

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
export const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(1000)

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

export async function endowAccounts(
  faucet: KeyringPair,
  addresses: Array<string>
): Promise<void> {
  await Promise.all(
    addresses.map((address) =>
      Balance.makeTransfer(address, ENDOWMENT).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: BlockchainUtils.IS_FINALIZED,
          reSign: true,
        }).catch((e) => console.log(e))
      )
    )
  )
}

export async function createMinimalFullDidFromLightDid(
  identity: KeyringPair,
  lightDidForId: LightDidDetails,
  keystore: DemoKeystore
): Promise<FullDidDetails> {
  const { extrinsic, did } = await DidUtils.upgradeDid(
    lightDidForId,
    identity.address,
    keystore
  )

  await BlockchainUtils.signAndSubmitTx(extrinsic, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const queried = await DefaultResolver.resolveDoc(did)
  if (!queried) throw new Error('Light Did to full did not made')

  const key = {
    publicKey: hexToU8a(
      queried.details.getKeys(KeyRelationship.authentication)[0].publicKeyHex
    ),
    type: queried.details.getKeys(KeyRelationship.authentication)[0].type,
  }

  const addExtrinsic = await DidChain.getSetKeyExtrinsic(
    KeyRelationship.assertionMethod,
    key
  )

  const tx = await DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: (queried.details as FullDidDetails).getNextTxIndex(),
    call: addExtrinsic,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: queried.details.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: queried.details.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const refetchedDid = await DefaultResolver.resolveDoc(did)
  if (!refetchedDid) throw new Error('Light Did to full did not made')
  return refetchedDid.details as FullDidDetails
}

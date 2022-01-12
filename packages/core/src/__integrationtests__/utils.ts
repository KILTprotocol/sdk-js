/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */

import { BN } from '@polkadot/util'

import { Keyring } from '@kiltprotocol/utils'
import { encodeAddress, randomAsHex, randomAsU8a } from '@polkadot/util-crypto'
import {
  DemoKeystore,
  DidChain,
  DidCreationDetails,
  DidUtils,
  FullDidDetails,
  LightDidDetails,
  LightDidSupportedSigningKeyTypes,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { KeyringPair } from '@kiltprotocol/types'
import { CType } from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'
import { Balance } from '../balance'

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
  addresses: string[]
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

export async function createMinimalLightDid(
  keystore: DemoKeystore,
  seed?: string
): Promise<LightDidDetails> {
  const genSeed = seed || randomAsHex(32)
  const key = await keystore.generateKeypair({
    alg: SigningAlgorithms.Sr25519,
    seed: genSeed,
  })
  return LightDidDetails.fromIdentifier(
    encodeAddress(key.publicKey, 38),
    LightDidSupportedSigningKeyTypes.sr25519
  )
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  identity: KeyringPair,
  lightDidForId: LightDidDetails,
  keystore: DemoKeystore
): Promise<FullDidDetails> {
  const fullDidCreationDetails: DidCreationDetails = {
    did: DidUtils.getKiltDidFromIdentifier(lightDidForId.identifier, 'full'),
    keyRelationships: {
      authentication: new Set([lightDidForId.authenticationKey.id]),
      assertionMethod: new Set([lightDidForId.authenticationKey.id]),
      capabilityDelegation: new Set([lightDidForId.authenticationKey.id]),
    },
    keys: new Map([
      [lightDidForId.authenticationKey.id, lightDidForId.authenticationKey],
    ]),
    serviceEndpoints: new Map(),
  }

  const fullDid = new FullDidDetails({
    identifier: lightDidForId.identifier,
    ...fullDidCreationDetails,
  })

  const tx = await DidChain.generateCreateTxFromDidDetails(
    fullDid,
    identity.address,
    {
      alg: lightDidForId.authenticationKey.type,
      signer: keystore,
      signingPublicKey: lightDidForId.authenticationKey.publicKey,
    }
  )

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
  })

  return FullDidDetails.fromChainInfo(
    fullDid.identifier
  ) as Promise<FullDidDetails>
}

export async function createFullDidFromSeed(
  identity: KeyringPair,
  keystore: DemoKeystore,
  seed: string = randomAsHex()
): Promise<FullDidDetails> {
  const minimalDid = await createMinimalLightDid(keystore, seed)
  return createFullDidFromLightDid(identity, minimalDid, keystore)
}

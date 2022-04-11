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
import { randomAsHex, randomAsU8a } from '@polkadot/util-crypto'
import {
  DemoKeystore,
  DemoKeystoreUtils,
  DidMigrationCallback,
  FullDidCreationBuilder,
  FullDidDetails,
  LightDidDetails,
} from '@kiltprotocol/did'
import {
  BlockchainApiConnection,
  BlockchainUtils,
} from '@kiltprotocol/chain-helpers'
import type {
  IIdentity,
  ISubmittableResult,
  KeyringPair,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { CType } from '../ctype/CType'
import { Balance } from '../balance'
import { init } from '../kilt'

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(10000)

const WS_ADDRESS = 'ws://127.0.0.1:9944'
export async function initializeApi(): Promise<void> {
  return init({ address: WS_ADDRESS })
}

const keyring: Keyring = new Keyring({ ss58Format: 38, type: 'ed25519' })

// Dev Faucet account seed phrase
const faucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
// endowed accounts on development chain spec
// ids are ed25519 because the endowed accounts are
export const devFaucet = keyring.createFromUri(faucetSeed)
export const devAlice = keyring.createFromUri('//Alice')
export const devBob = keyring.createFromUri('//Bob')
export const devCharlie = keyring.createFromUri('//Charlie')

export function keypairFromRandom(): KeyringPair {
  return keyring.addFromSeed(randomAsU8a(32))
}
export function addressFromRandom(): IIdentity['address'] {
  return keypairFromRandom().address
}

export async function isCtypeOnChain(ctype: CType): Promise<boolean> {
  return ctype.verifyStored()
}

export const driversLicenseCType = CType.fromSchema({
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

export const driversLicenseCTypeForDeposit = CType.fromSchema({
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'Drivers License for deposit test',
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
    location: {
      type: 'string',
    },
  },
  type: 'object',
})

// Submits with resign = true by default and resolving when IS_IN_BLOCK
export async function submitExtrinsicWithResign(
  extrinsic: SubmittableExtrinsic,
  submitter: KeyringPair,
  resolveOn: SubscriptionPromise.ResultEvaluator = BlockchainUtils.IS_IN_BLOCK
): Promise<void> {
  await BlockchainUtils.signAndSubmitTx(extrinsic, submitter, {
    reSign: true,
    resolveOn,
  })
}

export async function endowAccounts(
  faucet: KeyringPair,
  addresses: string[],
  resolveOn: SubscriptionPromise.Evaluator<ISubmittableResult> = BlockchainUtils.IS_FINALIZED
): Promise<void> {
  await Promise.all(
    addresses.map((address) =>
      Balance.getTransferTx(address, ENDOWMENT).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn,
          reSign: true,
        }).catch((e) => console.log(e))
      )
    )
  )
}

export async function fundAccount(
  address: KeyringPair['address'],
  amount: BN
): Promise<void> {
  const transferTx = await Balance.getTransferTx(address, amount)
  return submitExtrinsicWithResign(transferTx, devFaucet).catch((e) =>
    console.log(e)
  )
}
export async function createEndowedTestAccount(
  amount: BN = ENDOWMENT
): Promise<KeyringPair> {
  const keypair = keypairFromRandom()
  await fundAccount(keypair.address, amount)
  return keypair
}

export function getDefaultMigrationCallback(
  submitter: KeyringPair
): DidMigrationCallback {
  return async (e) => {
    await BlockchainUtils.signAndSubmitTx(e, submitter, {
      reSign: true,
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  }
}

export function getDefaultSubmitCallback(
  submitter: KeyringPair
): DidMigrationCallback {
  return async (e) => {
    await BlockchainUtils.signAndSubmitTx(e, submitter, {
      reSign: true,
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  }
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  identity: KeyringPair,
  lightDidForId: LightDidDetails,
  keystore: DemoKeystore
): Promise<FullDidDetails> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return FullDidCreationBuilder.fromLightDidDetails(api, lightDidForId)
    .setAttestationKey(lightDidForId.authenticationKey)
    .setDelegationKey(lightDidForId.authenticationKey)
    .buildAndSubmit(keystore, identity.address, async (tx) => {
      await submitExtrinsicWithResign(tx, identity)
    })
}

export async function createFullDidFromSeed(
  identity: KeyringPair,
  keystore: DemoKeystore,
  seed: string = randomAsHex()
): Promise<FullDidDetails> {
  const lightDid = await DemoKeystoreUtils.createMinimalLightDidFromSeed(
    keystore,
    seed
  )
  return createFullDidFromLightDid(identity, lightDid, keystore)
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */

import { BN } from '@polkadot/util'

import { Keyring, ss58Format } from '@kiltprotocol/utils'
import { makeSigningKeyTool } from '@kiltprotocol/testing'
import { DidMigrationCallback, SigningAlgorithms } from '@kiltprotocol/did'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import type {
  ICType,
  IIdentity,
  ISubmittableResult,
  KeyringPair,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import * as CType from '../ctype'
import { Balance } from '../balance'
import { connect, init } from '../kilt'

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(10000)

const containerPromise = new GenericContainer(
  process.env.TESTCONTAINERS_NODE_IMG || 'kiltprotocol/mashnet-node:latest'
)
  .withCmd(['--dev', '--ws-port', '9944', '--ws-external'])
  .withExposedPorts(9944)
  .withWaitStrategy(Wait.forLogMessage('Idle'))
  .start()

async function getStartedTestContainer(): Promise<StartedTestContainer> {
  try {
    return await containerPromise
  } catch (error) {
    console.error(
      'Could not start the docker container via testcontainers, run with DEBUG=testcontainers* to debug'
    )
    throw error
  }
}

export async function initializeApi(): Promise<void> {
  const started = await getStartedTestContainer()
  const port = started.getMappedPort(9944)
  const host = started.getHost()
  const WS_ADDRESS = `ws://${host}:${port}`
  await init({ address: WS_ADDRESS })
  const api = await connect()

  api.once('disconnected', async () => {
    try {
      await started.stop()
    } catch (error) {
      console.error(error)
    }
  })
}

const keyring: Keyring = new Keyring({ ss58Format, type: 'ed25519' })

// Dev Faucet account seed phrase
const faucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
// endowed accounts on development chain spec
// ids are ed25519 because the endowed accounts are
export const devFaucet = keyring.createFromUri(faucetSeed)
export const devAlice = keyring.createFromUri('//Alice')
export const devBob = keyring.createFromUri('//Bob')
export const devCharlie = keyring.createFromUri('//Charlie')

export function addressFromRandom(): IIdentity['address'] {
  return makeSigningKeyTool(SigningAlgorithms.Ed25519).keypair.address
}

export async function isCtypeOnChain(ctype: ICType): Promise<boolean> {
  return CType.verifyStored(ctype)
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

// Submits resolving when IS_IN_BLOCK
export async function submitExtrinsic(
  extrinsic: SubmittableExtrinsic,
  submitter: KeyringPair,
  resolveOn: SubscriptionPromise.ResultEvaluator = Blockchain.IS_IN_BLOCK
): Promise<void> {
  await Blockchain.signAndSubmitTx(extrinsic, submitter, {
    resolveOn,
  })
}

export async function endowAccounts(
  faucet: KeyringPair,
  addresses: string[],
  resolveOn: SubscriptionPromise.Evaluator<ISubmittableResult> = Blockchain.IS_FINALIZED
): Promise<void> {
  try {
    const api = await BlockchainApiConnection.getConnectionOrConnect()
    const transactions = await Promise.all(
      addresses.map((address) => Balance.getTransferTx(address, ENDOWMENT))
    )
    const batch = api.tx.utility.batchAll(transactions)
    await Blockchain.signAndSubmitTx(batch, faucet, { resolveOn })
  } catch (error) {
    console.log(error)
  }
}

export async function fundAccount(
  address: KeyringPair['address'],
  amount: BN
): Promise<void> {
  const transferTx = await Balance.getTransferTx(address, amount)
  try {
    await submitExtrinsic(transferTx, devFaucet)
  } catch (error) {
    console.error(error)
  }
}

export async function createEndowedTestAccount(
  amount: BN = ENDOWMENT
): Promise<KeyringPair> {
  const { keypair } = makeSigningKeyTool()
  await fundAccount(keypair.address, amount)
  return keypair
}

export function getDefaultMigrationCallback(
  submitter: KeyringPair
): DidMigrationCallback {
  return async (e) => {
    await Blockchain.signAndSubmitTx(e, submitter, {
      resolveOn: Blockchain.IS_IN_BLOCK,
    })
  }
}

export function getDefaultSubmitCallback(
  submitter: KeyringPair
): DidMigrationCallback {
  return async (e) => {
    await Blockchain.signAndSubmitTx(e, submitter, {
      resolveOn: Blockchain.IS_IN_BLOCK,
    })
  }
}

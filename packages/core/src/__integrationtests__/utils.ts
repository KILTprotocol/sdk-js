/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */

import { BN } from '@polkadot/util'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

import { Keyring, ss58Format } from '@kiltprotocol/utils'
import { makeSigningKeyTool } from '@kiltprotocol/testing'
import { Blockchain } from '@kiltprotocol/chain-helpers'
import type {
  ICType,
  ISubmittableResult,
  KeyringPair,
  KiltAddress,
  KiltKeyringPair,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'

import * as CType from '../ctype'
import { Balance } from '../balance'
import { init } from '../kilt'

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(10000)

const WS_PORT = 9944

async function getStartedTestContainer(): Promise<StartedTestContainer> {
  try {
    const image =
      process.env.TESTCONTAINERS_NODE_IMG || 'kiltprotocol/mashnet-node'
    console.log(`using testcontainer with image ${image}`)
    const testcontainer = new GenericContainer(image)
      .withCmd(['--dev', `--ws-port=${WS_PORT}`, '--ws-external'])
      .withExposedPorts(WS_PORT)
      .withWaitStrategy(Wait.forLogMessage(`:${WS_PORT}`))
    const started = await testcontainer.start()
    return started
  } catch (error) {
    console.error(
      'Could not start the docker container via testcontainers, run with DEBUG=testcontainers* to debug'
    )
    throw error
  }
}

async function buildConnection(wsEndpoint: string): Promise<ApiPromise> {
  const provider = new WsProvider(wsEndpoint)
  const api = await ApiPromise.create({ provider })
  await init({ api })
  return api
}

export async function initializeApi(): Promise<ApiPromise> {
  const { TEST_WS_ADDRESS, JEST_WORKER_ID } = process.env
  if (TEST_WS_ADDRESS) {
    if (JEST_WORKER_ID !== '1') {
      throw new Error(
        'TEST_WS_ADDRESS is set but more than one jest worker was started. You cannot run tests in parallel when TEST_WS_ADDRESS is set. Please run jest with `-w 1`.'
      )
    }
    console.log(`connecting to node ${TEST_WS_ADDRESS}`)
    return buildConnection(TEST_WS_ADDRESS)
  }
  const started = await getStartedTestContainer()
  const port = started.getMappedPort(9944)
  const host = started.getHost()
  const WS_ADDRESS = `ws://${host}:${port}`
  console.log(`connecting to test container at ${WS_ADDRESS}`)
  const api = await buildConnection(WS_ADDRESS)
  api.once('disconnected', () => started.stop().catch())
  return api
}

const keyring = new Keyring({ ss58Format, type: 'ed25519' })

// Dev Faucet account seed phrase
const faucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
// endowed accounts on development chain spec
// ids are ed25519 because the endowed accounts are
export const devFaucet = keyring.createFromUri(faucetSeed) as KiltKeyringPair
export const devAlice = keyring.createFromUri('//Alice') as KiltKeyringPair
export const devBob = keyring.createFromUri('//Bob') as KiltKeyringPair
export const devCharlie = keyring.createFromUri('//Charlie') as KiltKeyringPair

export function addressFromRandom(): KiltAddress {
  return makeSigningKeyTool('ed25519').keypair.address
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
  const api = ConfigService.get('api')
  const transactions = await Promise.all(
    addresses.map((address) => Balance.getTransferTx(address, ENDOWMENT))
  )
  const batch = api.tx.utility.batchAll(transactions)
  await Blockchain.signAndSubmitTx(batch, faucet, { resolveOn })
}

export async function fundAccount(
  address: KeyringPair['address'],
  amount: BN
): Promise<void> {
  const transferTx = await Balance.getTransferTx(address, amount)
  await submitExtrinsic(transferTx, devFaucet)
}

export async function createEndowedTestAccount(
  amount: BN = ENDOWMENT
): Promise<KiltKeyringPair> {
  const { keypair } = makeSigningKeyTool()
  await fundAccount(keypair.address, amount)
  return keypair
}

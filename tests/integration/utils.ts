/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */

import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

import {
  Blockchain,
  CType,
  ConfigService,
  connect,
  init,
} from '@kiltprotocol/sdk-js'
import type {
  ICType,
  KeyringPair,
  KiltAddress,
  KiltKeyringPair,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import { makeSigningKeyTool } from '../testUtils/index.js'

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(10000)

const WS_PORT = 9944

async function getStartedTestContainer(): Promise<StartedTestContainer> {
  try {
    const image =
      process.env.TESTCONTAINERS_NODE_IMG || 'kiltprotocol/mashnet-node'
    console.log(`using testcontainer with image ${image}`)
    const testcontainer = new GenericContainer(image)
      .withCommand(['--dev', `--ws-port=${WS_PORT}`, '--ws-external'])
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
  await init({ submitTxResolveOn: Blockchain.IS_IN_BLOCK })
  return connect(wsEndpoint)
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

// Dev Faucet account seed phrase
const faucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
// endowed accounts on development chain spec
// ids are ed25519 because the endowed accounts are
export const devFaucet = Crypto.makeKeypairFromUri(faucetSeed)
export const devAlice = Crypto.makeKeypairFromUri('//Alice')
export const devBob = Crypto.makeKeypairFromUri('//Bob')
export const devCharlie = Crypto.makeKeypairFromUri('//Charlie')

export function addressFromRandom(): KiltAddress {
  return makeSigningKeyTool('ed25519').keypair.address
}

export async function isCtypeOnChain(ctype: ICType): Promise<boolean> {
  try {
    await CType.verifyStored(ctype)
    return true
  } catch {
    return false
  }
}

export const driversLicenseCType = CType.fromProperties('Drivers License', {
  name: {
    type: 'string',
  },
  age: {
    type: 'integer',
  },
})

export const driversLicenseCTypeForDeposit = CType.fromProperties(
  'Drivers License for deposit test',
  {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
    location: {
      type: 'string',
    },
  }
)

export const nftNameCType = CType.fromProperties('NFT collection name', {
  name: {
    type: 'string',
  },
})

// Submits resolving when IS_IN_BLOCK
export async function submitTx(
  extrinsic: SubmittableExtrinsic,
  submitter: KeyringPair,
  resolveOn?: SubscriptionPromise.ResultEvaluator
): Promise<void> {
  await Blockchain.signAndSubmitTx(extrinsic, submitter, {
    resolveOn,
  })
}

export async function endowAccounts(
  faucet: KeyringPair,
  addresses: string[],
  resolveOn?: SubscriptionPromise.ResultEvaluator
): Promise<void> {
  const api = ConfigService.get('api')
  const transactions = await Promise.all(
    addresses.map((address) => api.tx.balances.transfer(address, ENDOWMENT))
  )
  const batch = api.tx.utility.batchAll(transactions)
  await Blockchain.signAndSubmitTx(batch, faucet, { resolveOn })
}

export async function fundAccount(
  address: KeyringPair['address'],
  amount: BN
): Promise<void> {
  const api = ConfigService.get('api')
  const transferTx = api.tx.balances.transfer(address, amount)
  await submitTx(transferTx, devFaucet)
}

export async function createEndowedTestAccount(
  amount: BN = ENDOWMENT
): Promise<KiltKeyringPair> {
  const { keypair } = makeSigningKeyTool()
  await fundAccount(keypair.address, amount)
  return keypair
}

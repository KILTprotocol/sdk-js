/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import Kilt, {
  AttestationDetails,
  Did,
  KeyRelationship,
  SubmittableExtrinsic,
} from '@kiltprotocol/sdk-js'
import type { CTypeSchemaWithoutId, CType } from '@kiltprotocol/sdk-js'
// import type { SubmittableExtrinsic } from '@kiltprotocol/sdk-js'
import { BN } from '@polkadot/util'
import { KeyringPair } from '@polkadot/keyring/types'
import { Option } from '@polkadot/types'

// The following script setups the accounts and requests funds for each account
// The full identities are sent
// The ctypes are created here

type LightActor = {
  light: Did.LightDidDetails
  identity: KeyringPair
  balance: BN
}

type FullActor = {
  full: Did.FullDidDetails
  identity: KeyringPair
  balance: BN
}

export interface IActors {
  claimer: LightActor
  attester: FullActor
}

export interface ISetup {
  actors: IActors
  keystore: Did.DemoKeystore
  testIdentites: KeyringPair[]
  testMnemonics: string[]
}

const NODE_URL = 'ws://127.0.0.1:9944'

export async function getBalance(address: string): Promise<BN> {
  return Kilt.Balance.getBalances(address).then((balance) => balance.free)
}

export async function initialTransfer(
  faucet: KeyringPair,
  addresses: Array<string | undefined>
): Promise<void> {
  const initialAccountAmount = new BN(10 ** 13).muln(1000000)
  const filtered = addresses.filter(
    (val) => typeof val !== undefined
  ) as string[]
  await Promise.all(
    filtered.map((address) =>
      Kilt.Balance.makeTransfer(address, initialAccountAmount).then((tx) =>
        Kilt.BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        }).catch((e) => console.log(e))
      )
    )
  )
}

export async function ctypeCreator(
  did: Did.FullDidDetails,
  keystore: Did.DemoKeystore,
  identity: KeyringPair
): Promise<CType> {
  const rawCType: CTypeSchemaWithoutId = {
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
  }
  const ctype = Kilt.CType.fromSchema(rawCType)
  const stored = await ctype.verifyStored()
  if (stored) return ctype

  const tx = await ctype.store()
  const authorizedTx = await did.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )
  const awesome = await Kilt.BlockchainUtils.signAndSubmitTx(
    authorizedTx,
    identity
  )

  console.log(JSON.stringify(awesome.events, null, 4))

  return ctype
}

export async function setup(): Promise<ISetup> {
  /* Initialize KILT SDK and set up node endpoint */
  await Kilt.init({ address: NODE_URL })

  /* Creating the key ring store */
  const keyring = new Kilt.Utils.Keyring.Keyring({
    ss58Format: 38,
    type: 'sr25519',
  })
  // Initialize the demo keystore
  const keystore = new Kilt.Did.DemoKeystore()
  // Create the group of mnemonics for the script
  const generateClaimerMnemonic = Kilt.Utils.UUID.generate()
  const generateAttesterMnemonic = Kilt.Utils.UUID.generate()

  // Creating test mnemonics
  const testMnemonics: string[] = []

  for (let i = 0; i < 8; i += 1) {
    testMnemonics.push(Kilt.Utils.UUID.generate())
  }

  // the testing locally this should be //Alice
  const faucetMnemonic = '//Alice'
  // const faucetMnemonic =
  //   'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'

  /* Generating all the identities from the keyring  */
  const testIdentites: KeyringPair[] = []
  testMnemonics.forEach((val) =>
    testIdentites.push(keyring.addFromMnemonic(val))
  )

  const claimerIdentity = keyring.addFromMnemonic(generateClaimerMnemonic)
  const attesterIdentity = keyring.addFromMnemonic(generateAttesterMnemonic)
  const faucetIdentity = keyring.createFromUri(faucetMnemonic, {
    type: 'sr25519',
  })

  /* First check to see if the faucet has balance */
  const faucetBalance = await getBalance(faucetIdentity.address)
  if (!faucetBalance) throw new Error('The faucetBalance is empty')

  /* The faucet balance */
  console.log('The current faucet balance', faucetBalance.toString())
  // Sending tokens to all accounts

  const addressesToTransfer = [
    claimerIdentity.address,
    attesterIdentity.address,
  ]
  const testAddresses = testIdentites.map((val) => val.address)

  await initialTransfer(faucetIdentity, addressesToTransfer)
  await initialTransfer(faucetIdentity, testAddresses)

  const [claimerBalance, attesterBalance] = await Promise.all([
    getBalance(addressesToTransfer[0]),
    getBalance(addressesToTransfer[1]),
  ])

  /* The balances of the actors claimer, testOne and attester respectively */
  const [one, two, three, four, five, six, seven, eight] = await Promise.all([
    getBalance(testAddresses[0]),
    getBalance(testAddresses[1]),
    getBalance(testAddresses[2]),
    getBalance(testAddresses[3]),
    getBalance(testAddresses[4]),
    getBalance(testAddresses[5]),
    getBalance(testAddresses[6]),
    getBalance(testAddresses[7]),
  ])

  console.log(
    'The current claimer balance',
    claimerBalance.toString(),
    'The current attester balance',
    attesterBalance.toString(),
    'The current attester balance',
    one.toString(),
    'The current attester balance',
    two.toString(),
    'The current attester balance',
    three.toString(),
    'The current attester balance',
    four.toString(),
    'The current attester balance',
    five.toString(),
    'The current attester balance',
    six.toString(),
    'The current attester balance',
    seven.toString(),
    'The current attester balance',
    eight.toString()
  )
  /* Generating the claimerLightDid and testOneLightDid from the demo keystore with the generated seed both with sr25519 */
  const claimerLightDid = await Kilt.Did.createLightDidFromSeed(
    keystore,
    generateClaimerMnemonic
  )
  /* Generating the attesterFullDid and faucetFullDid from the demo keystore with the generated seed both with sr25519 */
  const attesterFullDid = await Kilt.Did.createOnChainDidFromSeed(
    attesterIdentity,
    keystore,
    generateAttesterMnemonic
  )

  const attesterBalanceAfterDidCreation = await getBalance(
    attesterIdentity.address
  )

  console.log(
    'balance after creating a DID on chain',
    attesterBalanceAfterDidCreation.toString()
  )

  return {
    keystore,
    actors: {
      claimer: {
        light: claimerLightDid,
        identity: claimerIdentity,
        balance: claimerBalance,
      },
      attester: {
        full: attesterFullDid,
        identity: attesterIdentity,
        balance: attesterBalanceAfterDidCreation,
      },
    },
    testIdentites,
    testMnemonics,
  }
}

export async function buildDidAndTxFromSeed(
  paymentAccount: KeyringPair,
  keystore: Did.DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = Kilt.Did.SigningAlgorithms.Ed25519
): Promise<{ extrinsic: SubmittableExtrinsic; did: string }> {
  const makeKey = (
    seed: string,
    alg: Did.SigningAlgorithms | Did.EncryptionAlgorithms
  ) =>
    keystore
      .generateKeypair({
        alg,
        seed,
      })
      .then((key) => ({
        ...key,
        type: Did.DemoKeystore.getKeypairTypeForAlg(alg),
      }))

  const keys = {
    [KeyRelationship.authentication]: await makeKey(
      mnemonicOrHexSeed,
      signingKeyType
    ),
    [KeyRelationship.assertionMethod]: await makeKey(
      `${mnemonicOrHexSeed}//assertionMethod`,
      signingKeyType
    ),
    [KeyRelationship.capabilityDelegation]: await makeKey(
      `${mnemonicOrHexSeed}//capabilityDelegation`,
      signingKeyType
    ),
    [KeyRelationship.keyAgreement]: await makeKey(
      `${mnemonicOrHexSeed}//keyAgreement`,
      Did.EncryptionAlgorithms.NaclBox
    ),
  }

  return Did.DidUtils.writeDidFromPublicKeys(
    keystore,
    paymentAccount.address,
    keys
  )
}

export async function queryDidTx(didIdentifier: string) {
  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const result = await api.query.did.did<
    Option<Did.DidTypes.IDidChainRecordCodec>
  >(didIdentifier)

  return result.unwrap()
}

export async function queryAttestationTx(claimHash: string) {
  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const result = await api.query.attestation.attestations<
    Option<AttestationDetails>
  >(claimHash)

  Kilt.Utils.DecoderUtils.assertCodecIsType(result, [
    'Option<AttestationDetails>',
  ])

  return result.unwrap()
}

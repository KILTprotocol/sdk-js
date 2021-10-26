/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */

import Kilt, {
  AttestationDetails,
  Balances,
  Did,
  IRequestForAttestation,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/sdk-js'
import type { CTypeSchemaWithoutId, CType } from '@kiltprotocol/sdk-js'
// import type { SubmittableExtrinsic } from '@kiltprotocol/sdk-js'
import { BN, hexToU8a } from '@polkadot/util'
import { KeyringPair } from '@polkadot/keyring/types'
import { Option } from '@polkadot/types'
import { mnemonicGenerate } from '@polkadot/util-crypto'

// The following script setups the accounts and requests funds for each account
// The full identities are sent
// The ctypes are created here

type LightActor = {
  light: Did.LightDidDetails
  identity: KeyringPair
}

export interface ISetup {
  claimer: LightActor
  keystore: Did.DemoKeystore
  testIdentities: KeyringPair[]
  testMnemonics: string[]
}

const NODE_URL = 'wss://westend.kilt.io:9977'

export async function getBalance(address: string): Promise<Balances> {
  return Kilt.Balance.getBalances(address).then((balance) => balance)
}

export async function initialTransfer(
  faucet: KeyringPair,
  addresses: Array<string | undefined>
): Promise<void> {
  const initialAccountAmount = new BN(10 ** 13).muln(10000)
  const filtered = addresses.filter(
    (val) => typeof val !== undefined
  ) as string[]
  await Promise.all(
    filtered.map((address) =>
      Kilt.Balance.makeTransfer(address, initialAccountAmount).then((tx) =>
        Kilt.BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
          reSign: true,
        }).catch((e) => console.log(e))
      )
    )
  )
  console.log('fail')
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
  await Kilt.BlockchainUtils.signAndSubmitTx(authorizedTx, identity)

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
  const generateClaimerMnemonic = mnemonicGenerate()

  // Creating test mnemonics
  const testMnemonics: string[] = []

  for (let i = 0; i < 9; i += 1) {
    testMnemonics.push(mnemonicGenerate())
  }

  // the testing locally this should be //Alice
  const faucetMnemonic =
    'print limb expire raw ecology regular crumble slot lab opera fold adjust'
  // const faucetMnemonic =
  //   'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'

  /* Generating all the identities from the keyring  */
  const testIdentities: KeyringPair[] = []
  testMnemonics.forEach((val) =>
    testIdentities.push(keyring.addFromMnemonic(val))
  )

  const claimerIdentity = keyring.addFromMnemonic(generateClaimerMnemonic)
  const faucetIdentity = keyring.createFromUri(faucetMnemonic, {
    type: 'sr25519',
  })

  /* First check to see if the faucet has balance */
  const faucetBalance = await getBalance(faucetIdentity.address)
  if (!faucetBalance) throw new Error('The faucetBalance is empty')

  /* The faucet balance */
  console.log('The current faucet balance', faucetBalance.free.toString())
  // Sending tokens to all accounts
  const testAddresses = testIdentities.map((val) => val.address)

  await initialTransfer(faucetIdentity, testAddresses)

  /* Generating the claimerLightDid and testOneLightDid from the demo keystore with the generated seed both with sr25519 */
  const claimerLightDid = await Kilt.Did.createLightDidFromSeed(
    keystore,
    generateClaimerMnemonic
  )

  return {
    keystore,
    claimer: {
      light: claimerLightDid,
      identity: claimerIdentity,
    },
    testIdentities,
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

export async function getTxFee(tx: SubmittableExtrinsic): Promise<BN> {
  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const { partialFee } = await api.rpc.payment.queryInfo(tx.toHex())

  return partialFee.toBn()
}

export async function getDidDeposit(didIdentifier: string): Promise<BN> {
  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const result = await api.query.did.did<Option<any>>(didIdentifier)
  Kilt.Utils.DecoderUtils.assertCodecIsType(result, ['Option<DidDetails>'])
  if (result.isSome) return result.unwrap().deposit.amount.toBn()
  return new BN(0)
}

export async function getAttestationDeposit(claimHash: string): Promise<BN> {
  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const result = await api.query.attestation.attestations<
    Option<AttestationDetails>
  >(claimHash)

  Kilt.Utils.DecoderUtils.assertCodecIsType(result, [
    'Option<AttestationDetails>',
  ])
  if (result.isSome) return result.unwrap().deposit.amount.toBn()

  return new BN(0)
}

export async function createFullDid(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<Did.FullDidDetails> {
  const testAccountBalanceBeforeDidCreation = await getBalance(identity.address)

  console.log(
    'balance before creating a DID on chain',
    testAccountBalanceBeforeDidCreation.toString()
  )

  /* Generating the attesterFullDid and faucetFullDid from the demo keystore with the generated seed both with sr25519 */
  const { extrinsic, did } = await buildDidAndTxFromSeed(
    identity,
    keystore,
    mnemonic,
    Kilt.Did.SigningAlgorithms.Sr25519
  )

  await Kilt.BlockchainUtils.signAndSubmitTx(extrinsic, identity, {
    reSign: true,
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })

  const queried = await Did.DefaultResolver.resolveDoc(did)

  return queried?.details as Did.FullDidDetails
}

export async function createAttestation(
  identity: KeyringPair,
  requestForAttestation: IRequestForAttestation,
  fullDid: Did.FullDidDetails,
  keystore: Did.DemoKeystore
): Promise<void> {
  const attestation = Kilt.Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  const tx = await attestation.store()
  const authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await Kilt.BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })
}

export async function createMinimalFullDidFromLightDid(
  identity: KeyringPair,
  lightDidForId: Did.LightDidDetails,
  keystore: Did.DemoKeystore
): Promise<Did.FullDidDetails> {
  const { extrinsic, did } = await Kilt.Did.DidUtils.upgradeDid(
    lightDidForId,
    identity.address,
    keystore
  )

  await Kilt.BlockchainUtils.signAndSubmitTx(extrinsic, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })

  const queried = await Did.DefaultResolver.resolveDoc(did)
  if (!queried) throw new Error('Light Did to full did not made')

  const key = {
    publicKey: hexToU8a(
      queried.details.getKeys(KeyRelationship.authentication)[0].publicKeyHex
    ),
    type: queried.details.getKeys(KeyRelationship.authentication)[0].type,
  }

  const addExtrinsic = await Kilt.Did.DidChain.getSetKeyExtrinsic(
    KeyRelationship.assertionMethod,
    key
  )

  const tx = await Kilt.Did.DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: (queried.details as Did.FullDidDetails).getNextTxIndex(),
    call: addExtrinsic,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: queried.details.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: queried.details.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  await Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })

  const refetchedDid = await Did.DefaultResolver.resolveDoc(did)
  if (!refetchedDid) throw new Error('Light Did to full did not made')
  return refetchedDid.details as Did.FullDidDetails
}

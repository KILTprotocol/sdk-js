/* eslint-disable */

import { KeyringPair } from '@polkadot/keyring/types'
import { BN, hexToU8a } from '@polkadot/util'
import Attestation from '../attestation/Attestation'
import { AttestationDetails } from '../attestation'
import { Keyring } from '@kiltprotocol/utils'
import { randomAsU8a, mnemonicGenerate } from '@polkadot/util-crypto'
import CType from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'
import {
  createLightDidFromSeed,
  DefaultResolver,
  DemoKeystore,
  DidChain,
  DidUtils,
  EncryptionAlgorithms,
  FullDidDetails,
  LightDidDetails,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import { Balance } from '../balance'
import {
  BlockchainApiConnection,
  BlockchainUtils,
} from '@kiltprotocol/chain-helpers'
import {
  CTypeSchemaWithoutId,
  IRequestForAttestation,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { DecoderUtils } from '@kiltprotocol/utils'
import { Option } from '@polkadot/types'

export type LightActor = {
  light: LightDidDetails
  identity: KeyringPair
}

export interface ISetup {
  claimer: LightActor
  keystore: DemoKeystore
  testIdentities: KeyringPair[]
  testMnemonics: string[]
}

export const EXISTENTIAL_DEPOSIT = new BN(10 ** 13)
export const ENDOWMENT = EXISTENTIAL_DEPOSIT.muln(100)

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
      Balance.makeTransfer(address, initialAccountAmount).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, faucet, {
          resolveOn: BlockchainUtils.IS_FINALIZED,
          reSign: true,
        }).catch((e) => console.log(e))
      )
    )
  )
  console.log('fail')
}

export async function ctypeCreator(
  did: FullDidDetails,
  keystore: DemoKeystore,
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
  const ctype = CType.fromSchema(rawCType)
  const stored = await ctype.verifyStored()
  if (stored) return ctype

  const tx = await ctype.store()
  const authorizedTx = await did.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )
  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity)

  return ctype
}

export async function setup(): Promise<ISetup> {
  /* Creating the key ring store */
  const keyring = new Keyring({
    ss58Format: 38,
    type: 'sr25519',
  })
  // Initialize the demo keystore
  const keystore = new DemoKeystore()
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
  const faucetBalance = await Balance.getBalances(faucetIdentity.address).then(
    (balance) => balance
  )
  if (!faucetBalance) throw new Error('The faucetBalance is empty')

  /* The faucet balance */
  console.log('The current faucet balance', faucetBalance.free.toString())
  // Sending tokens to all accounts
  const testAddresses = testIdentities.map((val) => val.address)

  await initialTransfer(faucetIdentity, testAddresses)

  /* Generating the claimerLightDid and testOneLightDid from the demo keystore with the generated seed both with sr25519 */
  const claimerLightDid = await createLightDidFromSeed(
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
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = SigningAlgorithms.Ed25519
): Promise<{ extrinsic: SubmittableExtrinsic; did: string }> {
  const makeKey = (
    seed: string,
    alg: SigningAlgorithms | EncryptionAlgorithms
  ) =>
    keystore
      .generateKeypair({
        alg,
        seed,
      })
      .then((key) => ({
        ...key,
        type: DemoKeystore.getKeypairTypeForAlg(alg),
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
      EncryptionAlgorithms.NaclBox
    ),
  }

  return DidUtils.writeDidFromPublicKeys(keystore, paymentAccount.address, keys)
}

export async function getTxFee(tx: SubmittableExtrinsic): Promise<BN> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const { partialFee } = await api.rpc.payment.queryInfo(tx.toHex())

  return partialFee.toBn()
}

export async function getDidDeposit(didIdentifier: string): Promise<BN> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const result = await api.query.did.did<Option<any>>(didIdentifier)
  DecoderUtils.assertCodecIsType(result, ['Option<DidDetails>'])
  if (result.isSome) return result.unwrap().deposit.amount.toBn()
  return new BN(0)
}

export async function getAttestationDeposit(claimHash: string): Promise<BN> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  const result = await api.query.attestation.attestations<
    Option<AttestationDetails>
  >(claimHash)

  DecoderUtils.assertCodecIsType(result, ['Option<AttestationDetails>'])
  if (result.isSome) return result.unwrap().deposit.amount.toBn()

  return new BN(0)
}

export async function createFullDid(
  identity: KeyringPair,
  mnemonic: string,
  keystore: DemoKeystore
): Promise<FullDidDetails> {
  const testAccountBalanceBeforeDidCreation = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)

  console.log(
    'balance before creating a DID on chain',
    testAccountBalanceBeforeDidCreation.toString()
  )

  /* Generating the attesterFullDid and faucetFullDid from the demo keystore with the generated seed both with sr25519 */
  const { extrinsic, did } = await buildDidAndTxFromSeed(
    identity,
    keystore,
    mnemonic,
    SigningAlgorithms.Sr25519
  )

  await BlockchainUtils.signAndSubmitTx(extrinsic, identity, {
    reSign: true,
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const queried = await DefaultResolver.resolveDoc(did)

  return queried?.details as FullDidDetails
}

export async function createAttestation(
  identity: KeyringPair,
  requestForAttestation: IRequestForAttestation,
  fullDid: FullDidDetails,
  keystore: DemoKeystore
): Promise<void> {
  const attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  const tx = await attestation.store()
  const authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })
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

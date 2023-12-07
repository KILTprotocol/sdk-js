/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type { NewDidEncryptionKey } from '@kiltprotocol/did'
import type {
  DidDocument,
  DidUrl,
  KiltEncryptionKeypair,
  KiltKeyringPair,
  SignerInterface,
} from '@kiltprotocol/types'

const { kilt } = window

const {
  ConfigService,
  CType,
  Did,
  Blockchain,
  Utils: { Crypto, ss58Format, Signers },
  BalanceUtils,
  Issuer,
  Verifier,
  Holder,
} = kilt

ConfigService.set({ submitTxResolveOn: Blockchain.IS_IN_BLOCK })

async function makeSigningKeypair(
  seed: string,
  type: KiltKeyringPair['type'] = 'sr25519'
): Promise<{
  keypair: KiltKeyringPair
  getSigners: (
    didDocument: DidDocument
  ) => Promise<Array<SignerInterface<string, DidUrl>>>
  storeDidSigners: SignerInterface[]
}> {
  const keypair = Crypto.makeKeypairFromUri(seed, type)

  const getSigners: (
    didDocument: DidDocument
  ) => Promise<Array<SignerInterface<string, DidUrl>>> = async (
    didDocument
  ) => {
    return (
      await Promise.all(
        didDocument.verificationMethod?.map(({ id }) =>
          kilt.Utils.Signers.getSignersForKeypair({
            keypair,
            id: `${didDocument.id}${id}`,
          })
        ) ?? []
      )
    ).flat()
  }
  const storeDidSigners = await kilt.Utils.Signers.getSignersForKeypair({
    keypair,
    id: keypair.address,
  })

  return {
    keypair,
    getSigners,
    storeDidSigners,
  }
}

function makeEncryptionKeypair(seed: string): KiltEncryptionKeypair {
  const { secretKey, publicKey } = Crypto.naclBoxPairFromSecret(
    Crypto.hash(seed, 256)
  )
  return {
    secretKey,
    publicKey,
    type: 'x25519',
  }
}

async function createFullDidFromKeypair(
  payer: KiltKeyringPair,
  keypair: KiltKeyringPair,
  encryptionKey: NewDidEncryptionKey
) {
  const api = ConfigService.get('api')
  const signers = await kilt.Utils.Signers.getSignersForKeypair({
    keypair,
    id: keypair.address,
  })

  const storeTx = await Did.getStoreTx(
    {
      authentication: [keypair],
      assertionMethod: [keypair],
      capabilityDelegation: [keypair],
      keyAgreement: [encryptionKey],
    },
    payer.address,
    signers
  )
  await Blockchain.signAndSubmitTx(storeTx, payer)

  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(
    Did.toChain(
      Did.getFullDidFromVerificationMethod({
        publicKeyMultibase: Did.keypairToMultibaseKey(keypair),
      })
    )
  )
  return Did.linkedInfoFromChain(encodedDidDetails).document
}

async function runAll() {
  // init sdk kilt config and connect to chain
  const api = await kilt.connect('ws://127.0.0.1:9944')

  // Accounts
  console.log('Account setup started')
  const FaucetSeed =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const payer = Crypto.makeKeypairFromUri(FaucetSeed)
  const payerSigners = await Signers.getSignersForKeypair({
    keypair: payer,
  })

  const { keypair: aliceKeypair, getSigners: aliceSign } =
    await makeSigningKeypair('//Alice')
  const aliceEncryptionKey = makeEncryptionKeypair('//Alice//enc')
  const alice = await createFullDidFromKeypair(
    payer,
    aliceKeypair,
    aliceEncryptionKey
  )
  if (!alice.keyAgreement?.[0])
    throw new Error('Impossible: alice has no encryptionKey')
  console.log('alice setup done')

  const { keypair: bobKeypair, getSigners: bobSign } = await makeSigningKeypair(
    '//Bob'
  )
  const bobEncryptionKey = makeEncryptionKeypair('//Bob//enc')
  const bob = await createFullDidFromKeypair(
    payer,
    bobKeypair,
    bobEncryptionKey
  )
  if (!bob.keyAgreement?.[0])
    throw new Error('Impossible: bob has no encryptionKey')
  console.log('bob setup done')

  // Light DID Account creation workflow
  const authPublicKey = Crypto.coToUInt8(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = Crypto.coToUInt8(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  const address = Crypto.encodeAddress(authPublicKey, ss58Format)
  const testDid = Did.createLightDidDocument({
    authentication: [{ publicKey: authPublicKey, type: 'ed25519' }],
    keyAgreement: [{ publicKey: encPublicKey, type: 'x25519' }],
  })
  if (
    testDid.id !==
    `did:kilt:light:01${address}:z1Ac9CMtYCTRWjetJfJqJoV7FcPDD9nHPHDHry7t3KZmvYe1HQP1tgnBuoG3enuGaowpF8V88sCxytDPDy6ZxhW`
  ) {
    throw new Error('DID Test Unsuccessful')
  } else console.info(`light DID successfully created`)

  // Chain DID workflow -> creation & deletion
  console.log('DID workflow started')
  const { keypair, getSigners, storeDidSigners } = await makeSigningKeypair(
    '//Foo',
    'ed25519'
  )

  const didStoreTx = await Did.getStoreTx(
    { authentication: [keypair] },
    payer.address,
    storeDidSigners
  )
  await Blockchain.signAndSubmitTx(didStoreTx, payer)

  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(
    Did.toChain(
      Did.getFullDidFromVerificationMethod({
        publicKeyMultibase: Did.keypairToMultibaseKey(keypair),
      })
    )
  )
  const fullDid = Did.linkedInfoFromChain(encodedDidDetails).document
  const resolved = await Did.resolve(fullDid.id)

  if (
    !resolved.didDocumentMetadata.deactivated &&
    resolved.didDocument?.id === fullDid.id
  ) {
    console.info('DID matches')
  } else {
    throw new Error('DIDs do not match')
  }

  const deleteTx = await Did.authorizeTx(
    fullDid.id,
    api.tx.did.delete(BalanceUtils.toFemtoKilt(0)),
    await getSigners(fullDid),
    payer.address
  )
  await Blockchain.signAndSubmitTx(deleteTx, payer)

  const resolvedAgain = await Did.resolve(fullDid.id)
  if (resolvedAgain.didDocumentMetadata.deactivated) {
    console.info('DID successfully deleted')
  } else {
    throw new Error('DID was not deleted')
  }

  // CType workflow
  console.log('CType workflow started')
  const DriversLicense = CType.fromProperties('Drivers License', {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
  })

  const cTypeStoreTx = await Did.authorizeTx(
    alice.id,
    api.tx.ctype.add(CType.toChain(DriversLicense)),
    await aliceSign(alice),
    payer.address
  )
  await Blockchain.signAndSubmitTx(cTypeStoreTx, payer)

  await CType.verifyStored(DriversLicense)
  console.info('CType successfully stored on chain')

  // Attestation workflow
  console.log('Attestation workflow started')
  const content = { name: 'Bob', age: 21 }

  const credential = await Issuer.createCredential({
    cType: DriversLicense,
    claims: content,
    subject: bob.id,
    issuer: alice.id,
  })

  console.info('Credential subject conforms to CType')

  if (
    credential.credentialSubject.name !== content.name ||
    credential.credentialSubject.age !== content.age ||
    credential.credentialSubject.id !== bob.id
  ) {
    throw new Error('Claim content inside Credential mismatching')
  }

  const issued = await Issuer.issue(credential, {
    did: alice.id,
    signers: [...(await aliceSign(alice)), ...payerSigners],
    submitterAccount: payer.address,
  })
  console.info('Credential issued')

  const credentialResult = await Verifier.verifyCredential(
    issued,
    {},
    {
      ctypeLoader: [DriversLicense],
    }
  )
  if (credentialResult.verified) {
    console.info('Credential proof verified')
    console.info('Credential status verified')
  } else {
    throw new Error(`Credential failed to verify: ${credentialResult.error}`, {
      cause: credentialResult,
    })
  }

  const challenge = kilt.Utils.Crypto.hashStr(
    kilt.Utils.Crypto.mnemonicGenerate()
  )

  const derived = await Holder.deriveProof(issued, {
    disclose: { allBut: ['/credentialSubject/name'] },
  })

  const presentation = await Holder.createPresentation(
    [derived],
    {
      did: bob.id,
      signers: await bobSign(bob),
    },
    {},
    {
      challenge,
    }
  )
  console.info('Presentation created')

  const presentationResult = await Verifier.verifyPresentation(presentation, {
    presentation: { challenge },
  })
  if (presentationResult.verified) {
    console.info('Presentation verified')
  } else {
    throw new Error(
      [
        'Presentation failed to verify',
        ...(presentationResult.error ?? []),
      ].join('\n  '),
      { cause: presentationResult }
    )
  }
}

window.runAll = runAll

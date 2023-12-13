/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type {
  KiltAddress,
  KiltKeyringPair,
  SignerInterface,
} from '@kiltprotocol/types'

const { kilt } = window

const {
  Issuer,
  Verifier,
  Holder,
  DidResolver,
  newIdentity,
  withSubmitterAccount,
  signerFromKeypair,
  generateKeypair,
} = kilt

async function createFullDidIdentity(
  payer: SignerInterface<'Ed25519', KiltAddress>,
  seed: string,
  signKeyType: KiltKeyringPair['type'] = 'sr25519'
) {
  const keypair = generateKeypair({ seed, type: signKeyType })

  const encryptionKey = generateKeypair({ seed, type: 'x25519' })

  const identity = await newIdentity({
    keys: {
      authentication: [keypair],
      assertionMethod: [keypair],
      delegationMethod: [keypair],
      keyAgreement: [encryptionKey],
    },
    transactionStrategy: withSubmitterAccount({ signer: payer }),
  })

  return {
    identity,
  }
}

async function runAll() {
  // init sdk kilt config and connect to chain
  const api = await kilt.connect('ws://127.0.0.1:9944')

  // Accounts
  console.log('Account setup started')
  const FaucetSeed =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const payerKp = generateKeypair({ seed: FaucetSeed, type: 'ed25519' })
  const payerSigner = await signerFromKeypair<'Ed25519', KiltAddress>({
    keypair: payerKp,
    algorithm: 'Ed25519',
  })

  console.log('faucet signer created')

  const { identity: alice } = await createFullDidIdentity(
    payerSigner,
    '//Alice',
    'ed25519'
  )
  console.log('alice setup done')

  const { identity: bob } = await createFullDidIdentity(
    payerSigner,
    '//Bob',
    'ed25519'
  )

  console.log('bob setup done')

  const authPublicKey = new Uint8Array([
    170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170,
    170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170,
    170, 170,
  ])
  const encPublicKey = new Uint8Array([
    187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187,
    187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187, 187,
    187, 187,
  ])
  const testDid = await newIdentity({
    keys: {
      authentication: [
        { secretKey: authPublicKey, publicKey: authPublicKey, type: 'ed25519' },
      ],
      keyAgreement: [
        { secretKey: encPublicKey, publicKey: encPublicKey, type: 'x25519' },
      ],
    },
  })
  const address = api.createType('Address', authPublicKey).toString()
  if (
    testDid.did !==
    `did:kilt:light:01${address}:z15dZSRuzEZGdAF16HajRyxeLdQEn6KLQxWsfPQqjBBGhcHxU1zE5LRpVFfJmbCro7Qnr8qB7cYJpeqiU4XQoH51H35QMnZZnDV5ujsdEpDDj2oWQW5AUyQgXyMXHqPbdHwdZzQT93hGcubqNG7YJ4`
  ) {
    throw new Error('DID Test Unsuccessful')
  } else console.info(`light DID successfully created`)

  // Chain DID workflow -> creation & deletion
  console.log('DID workflow started')
  const keypair = generateKeypair({ seed: '//Foo', type: 'ed25519' })

  const identity = await newIdentity({
    keys: keypair,
    transactionStrategy: withSubmitterAccount({ signer: payerSigner }),
  })

  const deleteTx = await identity.authorizeTx(api.tx.did.delete(0n))
  await identity.submitTx(deleteTx)

  const resolvedAgain = await DidResolver.resolve(identity.did, {})
  if (resolvedAgain.didDocumentMetadata.deactivated) {
    console.info('DID successfully deleted')
  } else {
    throw new Error('DID was not deleted')
  }

  // CType workflow
  console.log('CType workflow started')
  const DriversLicenseDef =
    '{"$schema":"ipfs://bafybeiah66wbkhqbqn7idkostj2iqyan2tstc4tpqt65udlhimd7hcxjyq/","additionalProperties":false,"properties":{"age":{"type":"integer"},"name":{"type":"string"}},"title":"Drivers License","type":"object"}'

  const cTypeStoreTx = await alice.authorizeTx(
    api.tx.ctype.add(DriversLicenseDef)
  )
  const { events } = await alice.submitTx(cTypeStoreTx)

  const ctypeHash = events
    ?.find((ev) => api.events.ctype.CTypeCreated.is(ev.event))
    ?.event.data[1].toHex()

  if (!ctypeHash || !(await api.query.ctype.ctypes(ctypeHash)).isSome) {
    throw new Error('storing ctype failed')
  }

  const DriversLicense = JSON.parse(DriversLicenseDef)
  DriversLicense.$id = `kilt:ctype:${ctypeHash}`

  console.info('CType successfully stored on chain')

  // Attestation workflow
  console.log('Attestation workflow started')
  const content = { name: 'Bob', age: 21 }

  const credential = await Issuer.createCredential({
    cType: DriversLicense,
    claims: content,
    subject: bob.did,
    issuer: alice.did,
  })

  console.info('Credential subject conforms to CType')

  if (
    credential.credentialSubject.name !== content.name ||
    credential.credentialSubject.age !== content.age ||
    credential.credentialSubject.id !== bob.did
  ) {
    throw new Error('Claim content inside Credential mismatching')
  }

  const issued = await Issuer.issue(credential, alice as any)
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

  const challenge = crypto.randomUUID()

  const derived = await Holder.deriveProof(issued, {
    disclose: { allBut: ['/credentialSubject/name'] },
  })

  const presentation = await Holder.createPresentation(
    [derived],
    bob,
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

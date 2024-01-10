/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type { ApiPromise } from '@polkadot/api'
import type {
  Did,
  DidDocument,
  DidUrl,
  KiltAddress,
  SignerInterface,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

const { kilt } = window

const {
  ConfigService,
  Issuer,
  Verifier,
  Holder,
  DidResolver,
  signAndSubmitTx,
  signerFromKeypair,
} = kilt

async function authorizeTx(
  api: ApiPromise,
  call: SubmittableExtrinsic,
  did: string,
  signer: SignerInterface,
  submitter: string,
  nonce = 1
) {
  let authorized = api.tx.did.submitDidCall(
    {
      did: did.slice(9),
      call,
      blockNumber: await api.query.system.number(),
      submitter,
      txCounter: nonce,
    },
    { ed25519: new Uint8Array(64) }
  )

  const signature = await signer.sign({ data: authorized.args[0].toU8a() })

  authorized = api.tx.did.submitDidCall(authorized.args[0].toU8a(), {
    ed25519: signature,
  })

  return authorized
}

async function createFullDid(
  payer: SignerInterface<'Ed25519' | 'Sr25519', KiltAddress>,
  keypair: { publicKey: Uint8Array; secretKey: Uint8Array }
) {
  const api = ConfigService.get('api')

  const signer: SignerInterface = await signerFromKeypair({
    keypair,
    algorithm: 'Ed25519',
  })
  const address = signer.id
  const getSigners: (
    didDocument: DidDocument
  ) => Array<SignerInterface<string, DidUrl>> = (didDocument) => {
    return (
      didDocument.verificationMethod?.map<
        Array<SignerInterface<string, DidUrl>>
      >(({ id }) => [
        {
          ...signer,
          id: `${didDocument.id}${id}`,
        },
      ]) ?? []
    ).flat()
  }

  let tx = api.tx.did.create(
    {
      did: address,
      submitter: payer.id,
      newAttestationKey: { ed25519: keypair.publicKey },
    },
    { ed25519: new Uint8Array(64) }
  )

  const signature = await signer.sign({ data: tx.args[0].toU8a() })
  tx = api.tx.did.create(tx.args[0].toU8a(), { ed25519: signature })

  await signAndSubmitTx(tx, payer)

  const { didDocument } = await DidResolver.resolve(
    `did:kilt:${address}` as Did,
    {}
  )
  if (!didDocument) {
    throw new Error(`failed to create did for account ${address}`)
  }

  return {
    didDocument,
    getSigners,
    address,
  }
}

async function runAll() {
  // init sdk kilt config and connect to chain
  const api = await kilt.connect('ws://127.0.0.1:9944')

  // Accounts
  console.log('Account setup started')
  const faucet = {
    publicKey: new Uint8Array([
      238, 93, 102, 137, 215, 142, 38, 187, 91, 53, 176, 68, 23, 64, 160, 101,
      199, 189, 142, 253, 209, 193, 84, 34, 7, 92, 63, 43, 32, 33, 181, 210,
    ]),
    secretKey: new Uint8Array([
      205, 253, 96, 36, 210, 176, 235, 162, 125, 84, 204, 146, 164, 76, 217,
      166, 39, 198, 155, 45, 189, 161, 94, 215, 229, 128, 133, 66, 81, 25, 174,
      3,
    ]),
  }
  const payerSigner = await signerFromKeypair<'Ed25519', KiltAddress>({
    keypair: faucet,
    algorithm: 'Ed25519',
  })

  console.log('faucet signer created')

  const { didDocument: alice, getSigners: aliceSign } = await createFullDid(
    payerSigner,
    {
      publicKey: new Uint8Array([
        136, 220, 52, 23, 213, 5, 142, 196, 180, 80, 62, 12, 18, 234, 26, 10,
        137, 190, 32, 15, 233, 137, 34, 66, 61, 67, 52, 1, 79, 166, 176, 238,
      ]),
      secretKey: new Uint8Array([
        171, 248, 229, 189, 190, 48, 198, 86, 86, 192, 163, 203, 209, 129, 255,
        138, 86, 41, 74, 105, 223, 237, 210, 121, 130, 170, 206, 74, 118, 144,
        145, 21,
      ]),
    }
  )
  console.log('alice setup done')

  const { didDocument: bob, getSigners: bobSign } = await createFullDid(
    payerSigner,
    {
      publicKey: new Uint8Array([
        209, 124, 45, 120, 35, 235, 242, 96, 253, 19, 143, 45, 126, 39, 209, 20,
        192, 20, 93, 150, 139, 95, 245, 0, 97, 37, 242, 65, 79, 173, 174, 105,
      ]),
      secretKey: new Uint8Array([
        59, 123, 96, 175, 42, 188, 213, 123, 164, 1, 171, 57, 143, 132, 244,
        202, 84, 189, 107, 33, 64, 210, 80, 63, 188, 243, 40, 101, 53, 254, 63,
        241,
      ]),
    }
  )

  console.log('bob setup done')

  // Light DID Account creation workflow
  const authPublicKey =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  // const encPublicKey =
  //   '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

  const address = api.createType('Address', authPublicKey).toString()
  const resolved = await DidResolver.resolve(
    `did:kilt:light:01${address}:z1Ac9CMtYCTRWjetJfJqJoV7FcPDD9nHPHDHry7t3KZmvYe1HQP1tgnBuoG3enuGaowpF8V88sCxytDPDy6ZxhW` as Did,
    {}
  )
  if (
    !resolved.didDocument ||
    resolved.didDocument?.keyAgreement?.length !== 1
  ) {
    throw new Error('DID Test Unsuccessful')
  } else console.info(`light DID successfully resolved`)

  // Chain DID workflow -> creation & deletion
  console.log('DID workflow started')
  const {
    didDocument: fullDid,
    getSigners,
    address: didAddress,
  } = await createFullDid(payerSigner, {
    publicKey: new Uint8Array([
      157, 198, 166, 93, 125, 173, 238, 122, 17, 146, 49, 238, 62, 111, 140, 45,
      26, 6, 94, 42, 60, 167, 79, 19, 142, 20, 212, 5, 130, 44, 214, 190,
    ]),
    secretKey: new Uint8Array([
      252, 195, 96, 143, 203, 194, 37, 74, 205, 243, 137, 71, 234, 82, 57, 46,
      212, 14, 113, 177, 1, 241, 62, 118, 184, 230, 121, 219, 17, 45, 36, 143,
    ]),
  })

  if (
    fullDid.authentication?.length === 1 &&
    fullDid.assertionMethod?.length === 1 &&
    fullDid.id.endsWith(didAddress)
  ) {
    console.info('DID matches')
  } else {
    throw new Error('DIDs do not match')
  }

  const deleteTx = await authorizeTx(
    api,
    api.tx.did.delete(0),
    fullDid.id,
    getSigners(fullDid)[0],
    payerSigner.id
  )

  await signAndSubmitTx(deleteTx, payerSigner)

  const resolvedAgain = await DidResolver.resolve(fullDid.id, {})
  if (resolvedAgain.didDocumentMetadata.deactivated) {
    console.info('DID successfully deleted')
  } else {
    throw new Error('DID was not deleted')
  }

  // CType workflow
  console.log('CType workflow started')
  const DriversLicenseDef =
    '{"$schema":"ipfs://bafybeiah66wbkhqbqn7idkostj2iqyan2tstc4tpqt65udlhimd7hcxjyq/","additionalProperties":false,"properties":{"age":{"type":"integer"},"name":{"type":"string"}},"title":"Drivers License","type":"object"}'

  const cTypeStoreTx = await authorizeTx(
    api,
    api.tx.ctype.add(DriversLicenseDef),
    alice.id,
    aliceSign(alice)[0],
    payerSigner.id
  )

  const result = await signAndSubmitTx(cTypeStoreTx, payerSigner)

  const ctypeHash = result.events
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
    signers: [...(await aliceSign(alice)), payerSigner],
    submitterAccount: payerSigner.id,
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

  const challenge = crypto.randomUUID()

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

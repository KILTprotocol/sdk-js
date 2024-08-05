/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type { KiltAddress, SignerInterface } from '@kiltprotocol/types'

const { kilt: Kilt } = window

async function runAll() {
  const api = await Kilt.connect('ws://127.0.0.1:9944')

  console.log('connected')

  const authenticationKeyPair = Kilt.generateKeypair({ type: 'ed25519' })

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

  const [submitter] = (await Kilt.getSignersForKeypair({
    keypair: faucet,
    type: 'Ed25519',
  })) as Array<SignerInterface<'Ed25519', KiltAddress>>

  console.log('keypair generation complete')

  // ┏━━━━━━━━━━━━┓
  // ┃ create DID ┃
  // ┗━━━━━━━━━━━━┛
  //
  // Generate the DID-signed creation tx and submit it to the blockchain with the specified account.
  // The DID Document will have one Verification Key with an authentication relationship.
  //
  // Note the following parameters:
  // - `api`: The connected blockchain api.
  // - `signers`: The keys for verification materials inside the DID Document. For creating a DID,
  // only the key for the authentication verification method is required.
  // - `submitter`: The account used to submit the transaction to the blockchain. Note: the submitter account must have
  // enough funds to cover the required storage deposit.
  // - `fromPublicKey`: The public key that will feature as the DID's initial authentication method and will determine the DID identifier.

  const transactionHandler = Kilt.DidHelpers.createDid({
    api,
    signers: [authenticationKeyPair],
    submitter,
    fromPublicKey: authenticationKeyPair.publicKeyMultibase,
  })

  // The `createDid` function returns a transaction handler, which includes two methods:
  // - `submit`: Submits a transaction for inclusion in a block, resulting in its execution in the blockchain runtime.
  // - `getSubmittable`: Produces transaction that can be submitted to a blockchain node for inclusion, or signed and submitted by an external service.

  // Submit transaction.
  // Note: `submit()` by default, waits for the block to be finalized. This behaviour can be overwritten
  // in the function's optional parameters.
  const didDocumentTransactionResult = await transactionHandler.submit()

  // Once the transaction is submitted, the result should be checked.
  // For the sake of this example, we will only check if the transaction went through.
  if (didDocumentTransactionResult.status !== 'confirmed') {
    throw new Error('create DID failed')
  }

  // Get the DID Document from the transaction result.
  let { didDocument, signers } = didDocumentTransactionResult.asConfirmed

  console.log('Did created')

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Create Verification Method ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // - `DidHelpers` include a function to add a verification methods.
  // Similar to `createDid`, setting a verification method requires some parameters.
  //
  // - `didDocument` is the latest state of the DID Document that shall be updated.
  // - `signers` includes all the keypairs included in the DID documents and necessary for the
  // specified operation, in this case, the keypair of the authentication key, which is necessary to
  // allow updates to the DID Document.
  // - `publicKey` is the key used for the verification method.
  //
  // Note: setting a verification method will remove any existing method for the specified relationship.

  // TODO: use mnemonic here.
  const assertionKeyPair = Kilt.generateKeypair({
    type: 'sr25519',
  })
  const vmTransactionResult = await Kilt.DidHelpers.setVerificationMethod({
    api,
    didDocument,
    signers: [...signers, assertionKeyPair],
    submitter,
    publicKey: assertionKeyPair.publicKeyMultibase,
    relationship: 'assertionMethod',
  }).submit()

  if (vmTransactionResult.status !== 'confirmed') {
    throw new Error('add verification method failed')
  }
  ;({ didDocument, signers } = vmTransactionResult.asConfirmed)

  console.log('assertion method added')

  // ┏━━━━━━━━━━━━━━━━━┓
  // ┃ Claim web3name  ┃
  // ┗━━━━━━━━━━━━━━━━━┛
  const claimW3nTransactionResult = await Kilt.DidHelpers.claimWeb3Name({
    api,
    didDocument,
    submitter,
    signers,
    name: 'example123',
  }).submit()

  if (claimW3nTransactionResult.status !== 'confirmed') {
    throw new Error('claim web3name failed')
  }

  // The didDocument now contains an `alsoKnownAs` entry.
  ;({ didDocument } = claimW3nTransactionResult.asConfirmed)

  console.log('w3n claimed')

  // ┏━━━━━━━━━━━━━━━━┓
  // ┃ Add a service  ┃
  // ┗━━━━━━━━━━━━━━━━┛
  const addServiceTransactionResult = await Kilt.DidHelpers.addService({
    api,
    submitter,
    signers,
    didDocument,
    // TODO:  change service endpoint.
    service: {
      id: '#my_service',
      type: ['http://schema.org/EmailService'],
      serviceEndpoint: ['mailto:info@kilt.io'],
    },
  }).submit()

  if (addServiceTransactionResult.status !== 'confirmed') {
    throw new Error('add service failed')
  }
  ;({ didDocument } = addServiceTransactionResult.asConfirmed)

  console.log('service added')

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Register a CType             ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // Register a credential type on chain so we can issue credentials against it.
  //
  // Note:
  // We are registering a CType that has been created previously using functionality from the @kiltprotocol/credentials package.
  // The @kiltprotocol/sdk-js package and bundle do not currently offer support for this.
  //
  // TODO: Decide if CType definitions are expected to be hardcoded in application logic, at least for credential issuance.
  // Verifying credentials / presentations is already possible even if the CType definition is not known.
  //
  const DriversLicenseDef =
    '{"$schema":"ipfs://bafybeiah66wbkhqbqn7idkostj2iqyan2tstc4tpqt65udlhimd7hcxjyq/","additionalProperties":false,"properties":{"age":{"type":"integer"},"name":{"type":"string"}},"title":"Drivers License","type":"object"}'

  const createCTypeResult = await Kilt.DidHelpers.transact({
    api,
    didDocument,
    signers,
    submitter,
    call: api.tx.ctype.add(DriversLicenseDef),
    expectedEvents: [{ section: 'CType', method: 'CTypeCreated' }],
  }).submit()

  if (createCTypeResult.status !== 'confirmed') {
    throw new Error('CType creation failed')
  }

  // TODO: We don't have the CType id in the definition, so we need to get it from the events.
  const ctypeHash = createCTypeResult.asConfirmed.events
    .find((event) => api.events.ctype.CTypeCreated.is(event))
    ?.data[1].toHex()

  if ((await api.query.ctype.ctypes(ctypeHash)).isEmpty) {
    throw new Error('CType not registered')
  }

  // TODO: Should we at least be able to load an existing CType from the chain?
  const DriversLicense = JSON.parse(DriversLicenseDef)
  DriversLicense.$id = `kilt:ctype:${ctypeHash}`

  console.log('CType registered')

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Issue a Credential           ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // Create and issue a credential using our Did.
  // The holder is also our Did, so we are issuing to ourselves here.
  //
  const unsigned = await Kilt.Issuer.createCredential({
    issuer: didDocument.id,
    credentialSubject: {
      id: didDocument.id,
      age: 22,
      name: 'Gustav',
    },
    cType: DriversLicense,
  })

  const credential = await Kilt.Issuer.issue(unsigned, {
    didDocument,
    signers: [...signers, submitter],
    submitter: submitter.id,
  })

  console.log('credential issued')

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Create a Presentation        ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // Create a derived credential that only contains selected properties (selective disclosure), then create a credential presentation for it.
  // The presentation includes a proof of ownership and is scoped to a verified and time frame to prevent unauthorized re-use.
  //
  const derived = await Kilt.Holder.deriveProof(credential, {
    includeClaims: ['/credentialSubject/age'],
  })

  const presentation = await Kilt.Holder.createPresentation(
    [derived],
    {
      didDocument,
      signers,
    },
    { verifier: didDocument.id, validUntil: new Date(Date.now() + 100_000) }
  )

  console.log('presentation created')

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Verify a Presentation        ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // Verify a presentation.
  //
  // Verification would fail if:
  // - The presentation is not signed by the holder's Did.
  // - The current time is outside of the validity time frame of the presentation.
  // - The verifier in the presentation does not match the one specified.
  //
  const { verified, error } = await Kilt.Verifier.verifyPresentation({
    presentation,
    verificationCriteria: {
      verifier: didDocument.id,
      proofPurpose: 'authentication',
    },
  })

  if (verified !== true) {
    throw new Error(`failed to verify credential: ${JSON.stringify(error)}`)
  }

  console.log('presentation verified')

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Remove a Verification Method ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // Removing a verification method can be done by specifying its id.
  //
  // Note:
  // - The provided `didDocument` must include the specified verification method.
  // - The authentication verification method can not be removed.
  const removeVmTransactionResult =
    await Kilt.DidHelpers.removeVerificationMethod({
      api,
      didDocument,
      signers,
      submitter,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      verificationMethodId: didDocument.assertionMethod![0],
      relationship: 'assertionMethod',
    }).submit()

  if (removeVmTransactionResult.status !== 'confirmed') {
    throw new Error('remove verification method failed')
  }
  ;({ didDocument } = removeVmTransactionResult.asConfirmed)

  console.log('assertion method removed')

  // ┏━━━━━━━━━━━━━━━━━━┓
  // ┃ Release web3name ┃
  // ┗━━━━━━━━━━━━━━━━━━┛
  //
  // A web3name can be released from a DID and potentially claimed by another DID.
  const releaseW3nTransactionResult = await Kilt.DidHelpers.releaseWeb3Name({
    api,
    didDocument,
    submitter,
    signers,
  }).submit()

  if (releaseW3nTransactionResult.status !== 'confirmed') {
    throw new Error('release web3name failed')
  }
  ;({ didDocument } = releaseW3nTransactionResult.asConfirmed)

  console.log('w3n released')

  // ┏━━━━━━━━━━━━━━━━━━┓
  // ┃ Remove a service ┃
  // ┗━━━━━━━━━━━━━━━━━━┛
  //
  // Services can be removed by specifying the service `id`
  const removeServiceTransactionResult = await Kilt.DidHelpers.removeService({
    api,
    submitter,
    signers,
    didDocument,
    id: '#my_service',
  }).submit()

  if (removeServiceTransactionResult.status !== 'confirmed') {
    throw new Error('remove service failed')
  }
  ;({ didDocument } = removeServiceTransactionResult.asConfirmed)

  console.log('service removed')

  // ┏━━━━━━━━━━━━━━━━━━┓
  // ┃ Deactivate a DID ┃
  // ┗━━━━━━━━━━━━━━━━━━┛
  //
  // _Permanently_ deactivate the DID, removing all verification methods and services from its document.
  // Deactivating a DID cannot be undone, once a DID has been deactivated, all operations on it (including attempts at re-creation) are permanently disabled.
  const deactivateDidTransactionResult = await Kilt.DidHelpers.deactivateDid({
    api,
    submitter,
    signers,
    didDocument,
  }).submit()

  if (deactivateDidTransactionResult.status !== 'confirmed') {
    throw new Error('deactivate DID failed')
  }
  ;({ didDocument } = deactivateDidTransactionResult.asConfirmed)

  if (Array.isArray(didDocument.verificationMethod)) {
    throw new Error('Did not deactivated')
  }

  console.log('Did deactivated')

  // Release the connection to the blockchain.
  await api.disconnect()

  console.log('disconnected')
}

window.runAll = runAll

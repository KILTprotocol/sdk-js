import * as kilt from "@kiltprotocol/sdk-js"
import * as did from "@kiltprotocol/did"
import * as utils from "./utils"

async function main() {
  let didTxCounter = 1
  await kilt.init({address: "ws://127.0.0.1:9944"})

  // Step 1: create authentication and encryption key

  const aliceKiltIdentity = kilt.Identity.buildFromMnemonic("")
  const aliceFirstAuthenticationKeyPair = utils.generate_ed25519_authentication_key()
  const aliceFirstEncryptionKeyPair = utils.generate_encryption_key()

  console.log(`\n👤 Alice address: ${aliceKiltIdentity.address}`)
  console.log(`🗝  Alice authentication Ed25519 public key: ${"0x" + Buffer.from(aliceFirstAuthenticationKeyPair.publicKey).toString("hex")}`)
  console.log(`🔑 Alice encryption X25519 public key: ${"0x" + Buffer.from(aliceFirstEncryptionKeyPair.publicKey).toString("hex")}`)

  await utils.waitForEnter("\n⏎ Press Enter to submit the DID creation tx:")

  // Step 2: create and submit DID creation tx

  const aliceDIDCreationTx = await did.chain.generateCreateTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      keys: {
        authentication: aliceFirstAuthenticationKeyPair,
        encryption: { ...aliceFirstEncryptionKeyPair, type: "x25519" }
      }
    },
    aliceFirstAuthenticationKeyPair
  )

  const bobKiltIdentity = kilt.Identity.buildFromURI("//Bob")

  console.log("⛓  Bob submitting Alice's DID creation with the authentication and encryption keys to the KILT chain...")

  await kilt.BlockchainUtils.signAndSubmitTx(aliceDIDCreationTx, bobKiltIdentity, {
    resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK
  })

  await utils.waitForEnter("✅  DID created! Press Enter to continue:")

  // // Step 3.1: generate new keys

  const aliceNewAuthenticationKeyPair = utils.generate_sr25519_authentication_key()
  const aliceNewAttestationKeyPair = utils.generate_sr25519_attestation_key()
  const aliceNewDelegationKeyPair = utils.generate_ed25519_delegation_key()
  const aliceNewEndpointUrl = "https://kilt.io"

  console.log(`\n\n🗝  Alice new authentication Sr25519 public key: ${"0x" + Buffer.from(aliceNewAuthenticationKeyPair.publicKey).toString("hex")}`)
  console.log(`🔑 Alice new attestation Sr25519 public key: ${"0x" + Buffer.from(aliceNewAttestationKeyPair.publicKey).toString("hex")}`)
  console.log(`🗝  Alice new delegation Ed25519 public key: ${"0x" + Buffer.from(aliceNewDelegationKeyPair.publicKey).toString("hex")}`)
  console.log(`🖥  Alice new endpoint URL: ${aliceNewEndpointUrl}`)

  await utils.waitForEnter("\n⏎ Press Enter to submit the DID update tx:")

  // Step 3.2: create and submit DID update tx

  let aliceDIDUpdateTx = await did.chain.generateUpdateTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      keysToUpdate: {
        authentication: aliceNewAuthenticationKeyPair,
        attestation: aliceNewAttestationKeyPair,
        delegation: aliceNewDelegationKeyPair
      },
      newEndpointUrl: aliceNewEndpointUrl,
      txCounter: didTxCounter++
    },
    aliceFirstAuthenticationKeyPair
  )

  console.log("⛓  Bob submitting Alice's DID update with the new information to the KILT chain...")

  await kilt.BlockchainUtils.signAndSubmitTx(aliceDIDUpdateTx, bobKiltIdentity, {
    resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK
  })

  await utils.waitForEnter("✅  DID updated! Press Enter to continue:")

  // Step 4: submit new update operation with old authentication key (should fail)

  aliceDIDUpdateTx = await did.chain.generateUpdateTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      newEndpointUrl: "https://new.kilt.io",
      txCounter: didTxCounter
    },
    // Old authentication key now replaced, will fail.
    aliceFirstAuthenticationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's DID update (signed with the old authentication key) to the KILT chain...")

  try {
    await kilt.BlockchainUtils.signAndSubmitTx(aliceDIDUpdateTx, bobKiltIdentity, {
      resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK
    })
  } catch {
    await utils.waitForEnter("❌  Error generated, as expected! Press Enter to continue:")
  }

  // Step 5: submit CTYPE creation without DID origin (should fail)
  let newCtype = kilt.CType.fromSchema(require("./ctype.json"))
  let ctypeCreationExtrinsic = await newCtype.store()

  console.log("\n\n⛓  Bob submitting Alice's CTYPE creation (without DID origin) to the KILT chain...")
  
  try {
    await kilt.BlockchainUtils.signAndSubmitTx(ctypeCreationExtrinsic, bobKiltIdentity, {
        resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
    })
  } catch {
    await utils.waitForEnter("❌  Error generated, as expected! Press Enter to continue:")
  }    

  // Step 5: submit CTYPE creation with a wrong key (should fail)

  let ctypeCreationTx = await did.chain.generateDidAuthenticatedTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      call: ctypeCreationExtrinsic,
      txCounter: didTxCounter,
    },
    // Delegation key, will fail.
    aliceNewDelegationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's CTYPE creation (using the delegation key) to the KILT chain...")
  
  try {
    await kilt.BlockchainUtils.signAndSubmitTx(ctypeCreationTx, bobKiltIdentity, {
        resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
    })
  } catch {
    await utils.waitForEnter("❌  Error generated, as expected! Press Enter to continue:")
  }

  // Step 6: submit CTYPE creation

  ctypeCreationTx = await did.chain.generateDidAuthenticatedTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      call: ctypeCreationExtrinsic,
      txCounter: didTxCounter++
    },
    aliceNewAttestationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's CTYPE creation to the KILT chain...")

  await kilt.BlockchainUtils.signAndSubmitTx(ctypeCreationTx, bobKiltIdentity, {
    resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
  })

  await utils.waitForEnter("✅  CTYPE created! Press Enter to continue:")

  // Step 7: DID update (removing the attestation key and the encryption key)

  aliceDIDUpdateTx = await did.chain.generateUpdateTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      keysToUpdate: {
        attestation: null
      },
      publicKeysToRemove: [utils.get_encryption_key_id()],
      txCounter: didTxCounter++
    },
    aliceNewAuthenticationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's DID update deleting the attestation and the encryption key to the KILT chain...")

  await kilt.BlockchainUtils.signAndSubmitTx(aliceDIDUpdateTx, bobKiltIdentity, {
    resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
  })

  await utils.waitForEnter("✅  DID updated! Press Enter to continue:")

  // Step 9: submit CTYPE creation with deleted key (should fail)

  newCtype = kilt.CType.fromSchema(require("./ctype2.json"))
  ctypeCreationExtrinsic = await newCtype.store()

  ctypeCreationTx = await did.chain.generateDidAuthenticatedTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      call: ctypeCreationExtrinsic,
      txCounter: didTxCounter
    },
    aliceNewAttestationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's CTYPE creation (using the deleted attestation key) to the KILT chain...")
  
  try {
    await kilt.BlockchainUtils.signAndSubmitTx(ctypeCreationTx, bobKiltIdentity, {
        resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
    })
  } catch {
    await utils.waitForEnter("❌  Error generated, as expected! Press Enter to continue:")
  }

  // Step 10: DID deletion

  const aliceDIDDeletionTx = await did.chain.generateDeleteTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      txCounter: didTxCounter++,
    },
    aliceNewAuthenticationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's DID deletion to the KILT chain...")
  
  await kilt.BlockchainUtils.signAndSubmitTx(aliceDIDDeletionTx, bobKiltIdentity, {
    resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
  })

  await utils.waitForEnter("✅  DID deleted! Press Enter to continue:")

  // Step 11: submit CTYPE creation with deleted DID

  ctypeCreationExtrinsic = await newCtype.store()

  ctypeCreationTx = await did.chain.generateDidAuthenticatedTx(
    {
      didIdentifier: aliceKiltIdentity.address,
      call: ctypeCreationExtrinsic,
      txCounter: didTxCounter
    },
    aliceNewAttestationKeyPair
  )

  console.log("\n\n⛓  Bob submitting Alice's CTYPE creation (after Alice's DID deletion) to the KILT chain...")
  
  try {
    await kilt.BlockchainUtils.signAndSubmitTx(ctypeCreationTx, bobKiltIdentity, {
        resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
    })
  } catch {
    await utils.waitForEnter("❌  Error generated, as expected! Press Enter to continue:")
  }
}
main().then(() => console.log("\nBye! 👋 👋 👋 ")).finally(kilt.disconnect)

process.on('SIGINT', async () => {
  console.log("\nBye! 👋 👋 👋 ");
  kilt.disconnect()
  process.exit(0);
})
import * as kilt from "@kiltprotocol/sdk-js"
import * as did from "@kiltprotocol/did"

async function main() {
    await kilt.init({address: "ws://127.0.0.1:9944"})

    const alice = kilt.Identity.buildFromURI("//Alice")
    const attestationKey = kilt.Identity.buildFromMnemonic("").signKeyringPair

    const bob = kilt.Identity.buildFromURI("//Bob")

    let didDetails = await did.chain.queryById(alice.address)
    console.log(didDetails)

    const tx = await did.chain.generateCreateTx(
        {
          didIdentifier: alice.address,
          keys: {
            authentication: alice.signKeyringPair,
            encryption: { ...alice.boxKeyPair, type: 'x25519' },
            attestation: attestationKey
          },
          endpointUrl: 'https://example.com',
        },
        alice.signKeyringPair
    )
    console.log(tx)

    await kilt.BlockchainUtils.signAndSubmitTx(tx, bob, {
        resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK
    })

    didDetails = await did.chain.queryById(alice.address)
    console.log(didDetails)

    const ctype = kilt.CType.fromSchema({
        title: kilt.Utils.UUID.generate(),
        properties: {},
        type: 'object',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })

    const ctypeCreationTx = await ctype.store()

    const didCallWrapperTx = await did.chain.generateDidAuthenticatedTx(
      {
        didIdentifier: alice.address,
        txCounter: 1,
        call: ctypeCreationTx,
      },
      attestationKey
    )
    
    await kilt.BlockchainUtils.signAndSubmitTx(didCallWrapperTx, bob, {
        resolveOn: kilt.BlockchainUtils.IS_IN_BLOCK,
    })

    const isCtypeStored = await kilt.CTypeUtils.verifyStored(ctype)
    console.log(isCtypeStored)
}

main().finally(kilt.disconnect)

/*
    STEPS:
        - Key generation
        - DID creation
        - DID update with wrong key
        - DID update
        - CTYPE creation with wrong key
        - CTYPE creation
        - Attestation key removal
        - New CTYPE creation after key removal (should fail)
        - DID deletion
        - CTYPE creation after DID removal (should fail)
*/
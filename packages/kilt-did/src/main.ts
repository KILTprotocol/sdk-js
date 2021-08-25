/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */
import Keyring from '@polkadot/keyring'

import {
  DemoKeystore,
  DidUtils,
  SigningAlgorithms,
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@kiltprotocol/did'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { KeyRelationship } from '@kiltprotocol/types'

async function main(): Promise<void> {
  // Generate the KILT account that will submit the DID creation tx to the KILT blockchain.
  // It must have enough funds to pay for the tx execution fees.
  const aliceKiltAccount = new Keyring({
    type: 'ed25519',
    // KILT has registered the ss58 prefix 38
    ss58Format: 38,
  }).createFromUri('//Alice')

  // Instantiate the demo keystore
  const keystore = new DemoKeystore()

  // Generate seed for the authentication key
  const authenticationSeed = '0x123456789'

  // Ask the keystore to generate a new keypar to use for authentication
  const authenticationKeyPublicDetails = await keystore.generateKeypair({
    seed: authenticationSeed,
    alg: SigningAlgorithms.Ed25519,
  })

  // Generate the DID-signed creation extrinsic
  const { submittable, did } = await DidUtils.writeDidfromPublicKeys(keystore, {
    [KeyRelationship.authentication]: {
      publicKey: authenticationKeyPublicDetails.publicKey,
      type: authenticationKeyPublicDetails.alg,
    },
  })
  // Will print `did:kilt:4rVETkZQcK9aBr6SHZXaHQSDyqFFMW2rN5HtEooWgdB92JMg`
  console.log(did)

  // Submit the DID creation tx to the KILT blockchain after signing it with the KILT account specified
  await BlockchainUtils.signAndSubmitTx(submittable, aliceKiltAccount, {
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
  })
}

main()

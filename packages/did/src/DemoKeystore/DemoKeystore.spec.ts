/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Crypto } from '@kiltprotocol/utils'
import { u8aToHex } from '@polkadot/util'
import { DemoKeystore, SigningAlgorithms } from './DemoKeystore'

/**
 * @group unit/did
 */

describe('Signing', () => {
  const keystore = new DemoKeystore()
  it('Correctly signs and verifies an Ecdsa signature', async () => {
    const key = await keystore.generateKeypair({
      alg: SigningAlgorithms.EcdsaSecp256k1,
    })
    expect(() => keystore.hasKeys([key])).toBeTruthy()
    const payload = Uint8Array.from(new Array(32).fill(1))
    const signedPayload = await keystore.sign({
      alg: key.alg,
      data: payload,
      publicKey: key.publicKey,
    })
    expect(() =>
      Crypto.verify(payload, signedPayload.data, u8aToHex(key.publicKey))
    ).toBeTruthy()
  })

  it('Correctly signs and verifies an Ed25519 signature', async () => {
    const key = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
    })
    expect(() => keystore.hasKeys([key])).toBeTruthy()
    const payload = Uint8Array.from(new Array(32).fill(1))
    const signedPayload = await keystore.sign({
      alg: key.alg,
      data: payload,
      publicKey: key.publicKey,
    })
    expect(() =>
      Crypto.verify(payload, signedPayload.data, u8aToHex(key.publicKey))
    ).toBeTruthy()
  })

  it('Correctly signs and verifies an Sr25519 signature', async () => {
    const key = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
    })
    expect(() => keystore.hasKeys([key])).toBeTruthy()
    const payload = Uint8Array.from(new Array(32).fill(1))
    const signedPayload = await keystore.sign({
      alg: key.alg,
      data: payload,
      publicKey: key.publicKey,
    })
    expect(() =>
      Crypto.verify(payload, signedPayload.data, u8aToHex(key.publicKey))
    ).toBeTruthy()
  })
})

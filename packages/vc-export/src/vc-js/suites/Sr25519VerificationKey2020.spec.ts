/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import { Keyring } from '@kiltprotocol/utils'
import { hexToU8a } from '@polkadot/util'
import { randomAsU8a, signatureVerify } from '@polkadot/util-crypto'
import { Sr25519VerificationKey2020 } from './Sr25519VerificationKey'

it('generates a key', async () => {
  const seed = hexToU8a(
    '0xe062a9b1550a909fd54f72b9cca8d3e0a67659ea458a00ef16c8eaa2bef2300c'
  )
  const key = await Sr25519VerificationKey2020.generate({
    seed,
    controller: 'Alice',
    id: 'Alice/key',
  })

  const fingerprint = key.fingerprint()
  expect(fingerprint).toMatchInlineSnapshot(
    `"z6QNpeAzjiWieArycF5BRtQcEu17GQmxGKPtmHqfeTXRtPkb"`
  )
  expect(key.verifyFingerprint({ fingerprint })).toMatchObject({
    valid: true,
  })

  expect(
    key.export({ publicKey: true, privateKey: true, includeContext: true })
  ).toMatchInlineSnapshot(`
    {
      "@context": "https://www.kilt.io/contexts/credentials",
      "controller": "Alice",
      "id": "Alice/key",
      "privateKeyBase58": "5L1QSY55brRkFPwJfNWx2oB8KWiABC2LiokHKXkPPuB8zatA1K4vVTN5MYLiJ2Mbi2f3AG1HRVeq7XmacTEfcxkZ",
      "publicKeyBase58": "5dkC1bP8pTq4TXJcSUYzLnn5Vz2dRt18TCYF8YvSZUwy",
      "type": "Sr25519VerificationKey2020",
    }
  `)
})

it('creates a valid sr25519 signature', async () => {
  const seed = hexToU8a(
    '0xe062a9b1550a909fd54f72b9cca8d3e0a67659ea458a00ef16c8eaa2bef2300c'
  )
  const key = await Sr25519VerificationKey2020.generate({ seed })
  const data = randomAsU8a()
  const signature = await key.signer().sign({ data })
  await expect(key.verifier().verify({ data, signature })).resolves.toBe(true)
  expect(
    signatureVerify(
      data,
      signature,
      new Keyring({ type: 'sr25519' }).addFromSeed(seed).address
    ).isValid
  ).toBe(true)
})

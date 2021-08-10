/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/identity
 */

import * as u8aUtil from '@polkadot/util/u8a'
import { Crypto } from '@kiltprotocol/utils'
import type { IPublicIdentity } from '@kiltprotocol/types'
import Identity from './Identity'

describe('general', () => {
  it('should fail creating identity based on invalid phrase', () => {
    const phraseWithUnknownWord =
      'taxi toddler rally tonight certain tired program settle topple what execute stew' // stew instead of few
    expect(() =>
      Identity.buildFromMnemonic(phraseWithUnknownWord)
    ).toThrowError()

    const phraseTooLong =
      'taxi toddler rally tonight certain tired program settle topple what execute'
    expect(() => Identity.buildFromMnemonic(phraseTooLong)).toThrowError()
  })

  it('should return instanceof PublicIdentity', () => {
    const alice = Identity.buildFromURI('//Alice')
    expect(alice.getPublicIdentity()).toMatchObject<IPublicIdentity>({
      address: expect.any(String),
      boxPublicKeyAsHex: expect.any(String),
      serviceAddress: undefined,
    })
  })
})

describe('ed25519', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should create known identities', () => {
    const alice = Identity.buildFromURI('//Alice', {
      signingKeyPairType: 'ed25519',
    })

    expect(alice.seedAsHex).toEqual('0x2f2f416c696365')

    expect(alice.address).toEqual(
      '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
    )

    expect(u8aUtil.u8aToHex(alice.signKeyringPair.publicKey)).toEqual(
      '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee'
    )
  })

  it('should create different identities with random phrases', () => {
    const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      signingKeyPairType: 'ed25519',
    })
    const bob = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      signingKeyPairType: 'ed25519',
    })

    expect(alice.signPublicKeyAsHex).not.toBeFalsy()
    expect(alice.boxKeyPair.publicKey).not.toBeFalsy()
    expect(alice.boxKeyPair.secretKey).not.toBeFalsy()
    expect(alice.seed).not.toBeFalsy()
    expect(alice.seedAsHex).not.toBeFalsy()

    expect(alice.signPublicKeyAsHex).not.toEqual(bob.signPublicKeyAsHex)
    expect(alice.getBoxPublicKey()).not.toEqual(bob.getBoxPublicKey())
    expect(alice.boxKeyPair.secretKey).not.toEqual(bob.boxKeyPair.secretKey)
    expect(alice.seed).not.toEqual(bob.seed)
    expect(alice.seedAsHex).not.toEqual(bob.seedAsHex)
  })

  it('should restore identity based on phrase', () => {
    const expectedPhrase =
      'taxi toddler rally tonight certain tired program settle topple what execute few'
    const alice = Identity.buildFromMnemonic(expectedPhrase, {
      signingKeyPairType: 'ed25519',
    })

    expect(alice.signPublicKeyAsHex).toEqual(
      '0x89bd53e9cde92516291a674475f41cc3d66f3db97463c92252e5c5b575ab9d0c'
    )

    expect(u8aUtil.u8aToHex(alice.boxKeyPair.publicKey)).toEqual(
      '0xac6f5e0780a4e38f1b2705eef3485e7a588b9ff98d7ee7222b7f1fed4d835145'
    )
    expect(u8aUtil.u8aToHex(alice.boxKeyPair.secretKey)).toEqual(
      '0x7329c426ed20a35f0486645f2f2b72f59db38319444c88c59c62108f50655261'
    )
  })

  it('should have different keys for signing and boxing', () => {
    const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      signingKeyPairType: 'ed25519',
    })
    expect(Crypto.coToUInt8(alice.signPublicKeyAsHex)).not.toEqual(
      alice.boxKeyPair.publicKey
    )
  })

  it('signs and verifies', () => {
    const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      signingKeyPairType: 'ed25519',
    })
    expect(Crypto.verify('hello', alice.sign('hello'), alice.address)).toEqual(
      true
    )
  })
})

describe('sr25519', () => {
  it('should have different keys for signing and boxing', () => {
    const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      signingKeyPairType: 'sr25519',
    })
    expect(Crypto.coToUInt8(alice.signPublicKeyAsHex)).not.toEqual(
      alice.boxKeyPair.publicKey
    )
  })

  it('signs and verifies', () => {
    const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      signingKeyPairType: 'sr25519',
    })
    expect(Crypto.verify('hello', alice.sign('hello'), alice.address)).toEqual(
      true
    )
  })

  describe('ecdsa', () => {
    it('should have different keys for signing and boxing', () => {
      const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
        signingKeyPairType: 'ecdsa',
      })
      expect(Crypto.coToUInt8(alice.signPublicKeyAsHex)).not.toEqual(
        alice.boxKeyPair.publicKey
      )
    })

    it('signs and verifies', () => {
      const alice = Identity.buildFromMnemonic(Identity.generateMnemonic(), {
        signingKeyPairType: 'ecdsa',
      })
      expect(
        Crypto.verify('hello', alice.sign('hello'), alice.address)
      ).toEqual(true)
    })
  })
})

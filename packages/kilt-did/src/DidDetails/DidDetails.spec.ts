/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { KeyRelationship } from '@kiltprotocol/types'
import { DidDetails, DidDetailsCreationOpts } from './DidDetails'

describe('functional tests', () => {
  const did = 'did:kilt:test'
  const keys = [
    {
      id: `${did}#1`,
      controller: did,
      includedAt: 100,
      type: 'ed25519',
      publicKeyHex: '0xed25519',
    },
    {
      id: `${did}#2`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex: '0x255191',
    },
    {
      id: `${did}#3`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex: '0x255192',
    },
    {
      id: `${did}#4`,
      controller: did,
      includedAt: 200,
      type: 'sr25519',
      publicKeyHex: '0xbeef',
    },
  ]
  const services = [
    {
      id: `${did}#service1`,
      type: 'messaging',
      serviceEndpoint: 'example.com',
    },
    {
      id: `${did}#service2`,
      type: 'telephone',
      serviceEndpoint: '123344',
    },
  ]
  const didDetails: DidDetailsCreationOpts = {
    did,
    keys,
    keyRelationships: {
      [KeyRelationship.authentication]: [keys[0].id],
      [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
      [KeyRelationship.assertionMethod]: [keys[3].id],
    },
    lastTxIndex: BigInt(10),
    services,
  }

  it('creates DidDetails', () => {
    const dd = new DidDetails(didDetails)
    expect(dd.did).toEqual(did)
    expect(dd.identifier).toMatchInlineSnapshot(`"test"`)
    expect(dd.getKeys()).toMatchInlineSnapshot(`
      Array [
        Object {
          "controller": "did:kilt:test",
          "id": "did:kilt:test#1",
          "includedAt": 100,
          "publicKeyHex": "0xed25519",
          "type": "ed25519",
        },
        Object {
          "controller": "did:kilt:test",
          "id": "did:kilt:test#2",
          "includedAt": 250,
          "publicKeyHex": "0x255191",
          "type": "x25519",
        },
        Object {
          "controller": "did:kilt:test",
          "id": "did:kilt:test#3",
          "includedAt": 250,
          "publicKeyHex": "0x255192",
          "type": "x25519",
        },
        Object {
          "controller": "did:kilt:test",
          "id": "did:kilt:test#4",
          "includedAt": 200,
          "publicKeyHex": "0xbeef",
          "type": "sr25519",
        },
      ]
    `)
    expect(dd.getServices()).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "did:kilt:test#service1",
          "serviceEndpoint": "example.com",
          "type": "messaging",
        },
        Object {
          "id": "did:kilt:test#service2",
          "serviceEndpoint": "123344",
          "type": "telephone",
        },
      ]
    `)
  })

  it('gets keys via role', () => {
    let dd = new DidDetails(didDetails)
    expect(dd.getKeyIds(KeyRelationship.authentication)).toEqual([keys[0].id])
    expect(dd.getKeys(KeyRelationship.authentication)).toEqual([keys[0]])
    expect(dd.getKeyIds(KeyRelationship.keyAgreement)).toEqual(
      didDetails.keyRelationships[KeyRelationship.keyAgreement]
    )
    expect(
      dd.getKeys(KeyRelationship.keyAgreement).map((key) => key.id)
    ).toEqual(didDetails.keyRelationships[KeyRelationship.keyAgreement])
    expect(dd.getKeyIds(KeyRelationship.assertionMethod)).toEqual([keys[3].id])

    dd = new DidDetails({
      ...didDetails,
      keyRelationships: { [KeyRelationship.authentication]: [keys[3].id] },
    })
    expect(
      dd.getKeys(KeyRelationship.authentication).map((key) => key.id)
    ).toEqual([keys[3].id])
    expect(dd.getKeyIds('none')).toEqual(keys.slice(0, 3).map((key) => key.id))
  })

  it('gets service via type', () => {
    const dd = new DidDetails(didDetails)
    expect(dd.getServices('messaging').map((s) => s.type)).toEqual([
      'messaging',
    ])
    expect(dd.getServices('telephone').map((s) => s.type)).toEqual([
      'telephone',
    ])
  })

  it('returns the next nonce', () => {
    let dd = new DidDetails(didDetails)
    expect(dd.getNextTxIndex().toString()).toEqual(
      (didDetails.lastTxIndex + BigInt(1)).toString()
    )
    expect(dd.getNextTxIndex().toString()).toEqual(
      (didDetails.lastTxIndex + BigInt(2)).toString()
    )
    dd = new DidDetails(didDetails)
    expect(dd.getNextTxIndex(false).toString()).toEqual(
      (didDetails.lastTxIndex + BigInt(1)).toString()
    )
    expect(dd.getNextTxIndex(false).toString()).toEqual(
      (didDetails.lastTxIndex + BigInt(1)).toString()
    )
  })

  it('gets the correct keys for each pallet', () => {
    const dd = new DidDetails({
      ...didDetails,
      keyRelationships: {
        [KeyRelationship.authentication]: [keys[0].id],
        [KeyRelationship.capabilityDelegation]: [keys[1].id],
        [KeyRelationship.assertionMethod]: [keys[3].id],
      },
    })
    expect(
      dd
        .getKeysForCall({ section: 'ctype', method: 'add' })
        .map((key) => key.id)
    ).toMatchInlineSnapshot(`
      Array [
        "did:kilt:test#4",
      ]
    `)
    expect(
      dd
        .getKeysForCall({ section: 'delegation', method: 'revokeDelegation' })
        .map((key) => key.id)
    ).toMatchInlineSnapshot(`
      Array [
        "did:kilt:test#2",
      ]
    `)
    expect(
      dd
        .getKeysForCall({ section: 'attestation', method: 'add' })
        .map((key) => key.id)
    ).toMatchInlineSnapshot(`
      Array [
        "did:kilt:test#4",
      ]
    `)
  })
})

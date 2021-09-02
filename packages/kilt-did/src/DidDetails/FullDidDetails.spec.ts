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
import { BN } from '@polkadot/util'
import { mapCallToKeyRelationship } from './FullDidDetails.utils'
import { FullDidDetails, FullDidDetailsCreationOpts } from './FullDidDetails'

describe('functional tests', () => {
  const identifier = '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e'
  const did = `did:kilt:v1:${identifier}`
  const keys = [
    {
      id: `${did}#1`,
      controller: did,
      includedAt: 100,
      type: 'ed25519',
      publicKeyHex:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    {
      id: `${did}#2`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
    {
      id: `${did}#3`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex:
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    },
    {
      id: `${did}#4`,
      controller: did,
      includedAt: 200,
      type: 'sr25519',
      publicKeyHex:
        '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
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
  const didDetails: FullDidDetailsCreationOpts = {
    did,
    keys,
    keyRelationships: {
      [KeyRelationship.authentication]: [keys[0].id],
      [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
      [KeyRelationship.assertionMethod]: [keys[3].id],
    },
    lastTxIndex: new BN(10),
    services,
  }

  it('creates FullDidDetails', () => {
    const dd = new FullDidDetails(didDetails)
    expect(dd.did).toEqual(did)
    expect(dd.identifier).toEqual(identifier)
    expect(dd.getKeys()).toMatchInlineSnapshot(`
      Array [
        Object {
          "controller": "${did}",
          "id": "${did}#1",
          "includedAt": 100,
          "publicKeyHex": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "type": "ed25519",
        },
        Object {
          "controller": "${did}",
          "id": "${did}#2",
          "includedAt": 250,
          "publicKeyHex": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          "type": "x25519",
        },
        Object {
          "controller": "${did}",
          "id": "${did}#3",
          "includedAt": 250,
          "publicKeyHex": "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          "type": "x25519",
        },
        Object {
          "controller": "${did}",
          "id": "${did}#4",
          "includedAt": 200,
          "publicKeyHex": "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          "type": "sr25519",
        },
      ]
    `)
    expect(dd.getServices()).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "${did}#service1",
          "serviceEndpoint": "example.com",
          "type": "messaging",
        },
        Object {
          "id": "${did}#service2",
          "serviceEndpoint": "123344",
          "type": "telephone",
        },
      ]
    `)
  })

  it('gets keys via role', () => {
    let dd = new FullDidDetails(didDetails)
    expect(dd.getKeyIds(KeyRelationship.authentication)).toEqual([keys[0].id])
    expect(dd.getKeys(KeyRelationship.authentication)).toEqual([keys[0]])
    expect(dd.getKeyIds(KeyRelationship.keyAgreement)).toEqual(
      didDetails.keyRelationships[KeyRelationship.keyAgreement]
    )
    expect(
      dd.getKeys(KeyRelationship.keyAgreement).map((key) => key.id)
    ).toEqual(didDetails.keyRelationships[KeyRelationship.keyAgreement])
    expect(dd.getKeyIds(KeyRelationship.assertionMethod)).toEqual([keys[3].id])

    dd = new FullDidDetails({
      ...didDetails,
      keyRelationships: { [KeyRelationship.authentication]: [keys[3].id] },
    })
    expect(
      dd.getKeys(KeyRelationship.authentication).map((key) => key.id)
    ).toEqual([keys[3].id])
    expect(dd.getKeyIds('none')).toEqual(keys.slice(0, 3).map((key) => key.id))
  })

  it('gets service via type', () => {
    const dd = new FullDidDetails(didDetails)
    expect(dd.getServices('messaging').map((s) => s.type)).toEqual([
      'messaging',
    ])
    expect(dd.getServices('telephone').map((s) => s.type)).toEqual([
      'telephone',
    ])
  })

  it('returns the next nonce', () => {
    let dd = new FullDidDetails(didDetails)
    expect(dd.getNextTxIndex().toString()).toEqual(
      didDetails.lastTxIndex.addn(1).toString()
    )
    expect(dd.getNextTxIndex().toString()).toEqual(
      didDetails.lastTxIndex.addn(2).toString()
    )
    dd = new FullDidDetails(didDetails)
    expect(dd.getNextTxIndex(false).toString()).toEqual(
      didDetails.lastTxIndex.addn(1).toString()
    )
    expect(dd.getNextTxIndex(false).toString()).toEqual(
      didDetails.lastTxIndex.addn(1).toString()
    )
  })

  it('gets the correct keys for each pallet', () => {
    const dd = new FullDidDetails({
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
        "${did}#4",
      ]
    `)
    expect(
      dd
        .getKeysForCall({ section: 'delegation', method: 'revokeDelegation' })
        .map((key) => key.id)
    ).toMatchInlineSnapshot(`
      Array [
        "${did}#2",
      ]
    `)
    expect(
      dd
        .getKeysForCall({ section: 'attestation', method: 'add' })
        .map((key) => key.id)
    ).toMatchInlineSnapshot(`
      Array [
        "${did}#4",
      ]
    `)
  })
})

describe('Key mapping tests', () => {
  it('gets the right key relationship for each pallet', () => {
    // CTYPE
    expect(
      mapCallToKeyRelationship({ section: 'ctype', method: 'add' })
    ).toMatchInlineSnapshot(`"assertionMethod"`)
    // DELEGATION
    expect(
      mapCallToKeyRelationship({
        section: 'delegation',
        method: 'addDelegation',
      })
    ).toMatchInlineSnapshot(`"capabilityDelegation"`)
    expect(
      mapCallToKeyRelationship({
        section: 'delegation',
        method: 'revokeDelegation',
      })
    ).toMatchInlineSnapshot(`"capabilityDelegation"`)
    // ATTESTATION
    expect(
      mapCallToKeyRelationship({ section: 'attestation', method: 'add' })
    ).toMatchInlineSnapshot(`"assertionMethod"`)
    expect(
      mapCallToKeyRelationship({ section: 'attestation', method: 'revoke' })
    ).toMatchInlineSnapshot(`"assertionMethod"`)

    // DID
    expect(
      mapCallToKeyRelationship({
        section: 'did',
        method: 'create',
      })
    ).toMatchInlineSnapshot(`"paymentAccount"`)
    expect(
      mapCallToKeyRelationship({
        section: 'did',
        method: 'update',
      })
    ).toMatchInlineSnapshot(`"authentication"`)
    expect(
      mapCallToKeyRelationship({ section: 'did', method: 'submitDidCall' })
    ).toMatchInlineSnapshot(`"paymentAccount"`)
    // BALANCES
    expect(
      mapCallToKeyRelationship({ section: 'balances', method: 'transfer' })
    ).toMatchInlineSnapshot(`"paymentAccount"`)
  })
})

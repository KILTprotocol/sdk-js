/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { base58Encode } from '@polkadot/util-crypto'
import { KeyRelationship } from '@kiltprotocol/types'
import { BN, hexToU8a } from '@polkadot/util'
import type { IDidKeyDetails, IServiceDetails } from '@kiltprotocol/types'
import type { INewPublicKey } from '../types'
import {
  FullDidDetails,
  FullDidDetailsCreationOpts,
} from '../DidDetails/FullDidDetails'
import {
  LightDidDetails,
  LightDidDetailsCreationOpts,
} from '../DidDetails/LightDidDetails'
import { exportToDidDocument } from './DidDocumentExporter'

describe('Full DID Document exporting tests', () => {
  const identifier = '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e'
  const did = `did:kilt:${identifier}`
  const keys: IDidKeyDetails[] = [
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

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, two x25519 encryption keys, an Sr25519 assertion key, an Ecdsa delegation key, and some service endpoints', () => {
    const ecdsaKey: IDidKeyDetails = {
      id: `${did}#5`,
      controller: did,
      includedAt: 200,
      type: 'ecdsa',
      publicKeyHex:
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    }
    const fullDidDetails = new FullDidDetails({
      ...didDetails,
      keyRelationships: {
        [KeyRelationship.authentication]: [keys[0].id],
        [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
        [KeyRelationship.assertionMethod]: [keys[3].id],
        [KeyRelationship.capabilityDelegation]: [ecdsaKey.id],
      },
      keys: keys.concat([ecdsaKey]),
    })

    const didDoc = exportToDidDocument(fullDidDetails, 'application/json')

    expect(didDoc.id).toMatch(fullDidDetails.did)

    expect(didDoc.authentication).toHaveLength(1)
    expect(didDoc.authentication).toContainEqual(`${fullDidDetails.did}#1`)

    expect(didDoc.keyAgreement).toHaveLength(2)
    expect(didDoc.keyAgreement).toContainEqual(`${fullDidDetails.did}#2`)
    expect(didDoc.keyAgreement).toContainEqual(`${fullDidDetails.did}#3`)

    expect(didDoc.assertionMethod).toHaveLength(1)
    expect(didDoc.assertionMethod).toContainEqual(`${fullDidDetails.did}#4`)

    expect(didDoc.capabilityDelegation).toHaveLength(1)
    expect(didDoc.capabilityDelegation).toContainEqual(
      `${fullDidDetails.did}#5`
    )

    expect(didDoc.verificationMethod).toHaveLength(5)
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#1`,
      controller: fullDidDetails.did,
      type: 'Ed25519VerificationKey2018',
      publicKeyBase58: base58Encode(keys[0].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#2`,
      controller: fullDidDetails.did,
      type: 'X25519KeyAgreementKey2019',
      publicKeyBase58: base58Encode(keys[1].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#3`,
      controller: fullDidDetails.did,
      type: 'X25519KeyAgreementKey2019',
      publicKeyBase58: base58Encode(keys[2].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#4`,
      controller: fullDidDetails.did,
      type: 'Sr25519VerificationKey2020',
      publicKeyBase58: base58Encode(keys[3].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#5`,
      controller: fullDidDetails.did,
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyBase58: base58Encode(ecdsaKey.publicKeyHex),
    })

    expect(didDoc.service).toHaveLength(2)
    expect(didDoc.service).toContainEqual(services[0])
    expect(didDoc.service).toContainEqual(services[1])
  })

  it('exports the expected application/ld+json W3C DID Document with only an authentication key', () => {
    const ecdsaKey: IDidKeyDetails = {
      id: `${did}#5`,
      controller: did,
      includedAt: 200,
      type: 'ecdsa',
      publicKeyHex:
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    }
    const fullDidDetails = new FullDidDetails({
      ...didDetails,
      keyRelationships: {
        [KeyRelationship.authentication]: [keys[0].id],
        [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
        [KeyRelationship.assertionMethod]: [keys[3].id],
        [KeyRelationship.capabilityDelegation]: [ecdsaKey.id],
      },
      keys: keys.concat([ecdsaKey]),
    })

    const didDoc = exportToDidDocument(fullDidDetails, 'application/ld+json')

    expect(didDoc.id).toMatch(fullDidDetails.did)

    expect(didDoc['@context']).toHaveLength(1)
    expect(didDoc['@context']).toContainEqual('https://www.w3.org/ns/did/v1')

    expect(didDoc.authentication).toHaveLength(1)
    expect(didDoc.authentication).toContainEqual(`${fullDidDetails.did}#1`)

    expect(didDoc.keyAgreement).toHaveLength(2)
    expect(didDoc.keyAgreement).toContainEqual(`${fullDidDetails.did}#2`)
    expect(didDoc.keyAgreement).toContainEqual(`${fullDidDetails.did}#3`)

    expect(didDoc.assertionMethod).toHaveLength(1)
    expect(didDoc.assertionMethod).toContainEqual(`${fullDidDetails.did}#4`)

    expect(didDoc.capabilityDelegation).toHaveLength(1)
    expect(didDoc.capabilityDelegation).toContainEqual(
      `${fullDidDetails.did}#5`
    )

    expect(didDoc.verificationMethod).toHaveLength(5)
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#1`,
      controller: fullDidDetails.did,
      type: 'Ed25519VerificationKey2018',
      publicKeyBase58: base58Encode(keys[0].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#2`,
      controller: fullDidDetails.did,
      type: 'X25519KeyAgreementKey2019',
      publicKeyBase58: base58Encode(keys[1].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#3`,
      controller: fullDidDetails.did,
      type: 'X25519KeyAgreementKey2019',
      publicKeyBase58: base58Encode(keys[2].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#4`,
      controller: fullDidDetails.did,
      type: 'Sr25519VerificationKey2020',
      publicKeyBase58: base58Encode(keys[3].publicKeyHex),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${fullDidDetails.did}#5`,
      controller: fullDidDetails.did,
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyBase58: base58Encode(ecdsaKey.publicKeyHex),
    })

    expect(didDoc.service).toHaveLength(2)
    expect(didDoc.service).toContainEqual(services[0])
    expect(didDoc.service).toContainEqual(services[1])
  })

  it('does not export a DID Document with an unsupported format', () => {
    const fullDidDetails = new FullDidDetails(didDetails)
    expect(() => exportToDidDocument(fullDidDetails, 'text/html')).toThrow()
  })
})

describe('Light DID Document exporting tests', () => {
  const authPublicKey = hexToU8a(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = hexToU8a(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  let authenticationDidKeyDetails: INewPublicKey = {
    publicKey: authPublicKey,
    type: 'ed25519',
  }
  let encryptionDidKeyDetails: INewPublicKey | undefined
  let services: IServiceDetails[] | undefined

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, an x25519 encryption key, and some service endpoints', () => {
    encryptionDidKeyDetails = {
      publicKey: encPublicKey,
      type: 'x25519',
    }
    services = [
      {
        id: `service1`,
        type: 'messaging',
        serviceEndpoint: 'example.com',
      },
      {
        id: `service2`,
        type: 'telephone',
        serviceEndpoint: '123344',
      },
    ]

    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
      encryptionKey: encryptionDidKeyDetails,
      services,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/json')

    expect(didDoc.id).toMatch(didDetails.did)

    expect(didDoc.authentication).toHaveLength(1)
    expect(didDoc.authentication).toContainEqual(
      `${didDetails.did}#authentication`
    )

    expect(didDoc.keyAgreement).toHaveLength(1)
    expect(didDoc.keyAgreement).toContainEqual(`${didDetails.did}#encryption`)

    expect(didDoc.assertionMethod).toBeUndefined()

    expect(didDoc.capabilityDelegation).toBeUndefined()

    expect(didDoc.verificationMethod).toHaveLength(2)
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${didDetails.did}#authentication`,
      controller: didDetails.did,
      type: 'Ed25519VerificationKey2018',
      publicKeyBase58: base58Encode(authenticationDidKeyDetails.publicKey),
    })
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${didDetails.did}#encryption`,
      controller: didDetails.did,
      type: 'X25519KeyAgreementKey2019',
      publicKeyBase58: base58Encode(encryptionDidKeyDetails.publicKey),
    })

    expect(didDoc.service).toHaveLength(2)
    expect(didDoc.service).toContainEqual({
      id: `${didDetails.did}#service1`,
      type: 'messaging',
      serviceEndpoint: 'example.com',
    })
    expect(didDoc.service).toContainEqual({
      id: `${didDetails.did}#service2`,
      type: 'telephone',
      serviceEndpoint: '123344',
    })
  })

  it('exports the expected application/json W3C DID Document with an Sr25519 authentication key', () => {
    authenticationDidKeyDetails = {
      publicKey: authPublicKey,
      type: 'sr25519',
    }
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/json')

    expect(didDoc.id).toMatch(didDetails.did)

    expect(didDoc.authentication).toHaveLength(1)
    expect(didDoc.authentication).toContainEqual(
      `${didDetails.did}#authentication`
    )

    expect(didDoc.keyAgreement).toBeUndefined()

    expect(didDoc.assertionMethod).toBeUndefined()

    expect(didDoc.capabilityDelegation).toBeUndefined()

    expect(didDoc.verificationMethod).toHaveLength(1)
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${didDetails.did}#authentication`,
      controller: didDetails.did,
      type: 'Sr25519VerificationKey2020',
      publicKeyBase58: base58Encode(authenticationDidKeyDetails.publicKey),
    })

    expect(didDoc.service).toBeUndefined()
  })

  it('exports the expected application/json W3C DID Document with an Ecdsa authentication key', () => {
    authenticationDidKeyDetails = {
      publicKey: authPublicKey,
      type: 'ecdsa',
    }
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/json')

    expect(didDoc.id).toMatch(didDetails.did)

    expect(didDoc.authentication).toHaveLength(1)
    expect(didDoc.authentication).toContainEqual(
      `${didDetails.did}#authentication`
    )

    expect(didDoc.keyAgreement).toBeUndefined()

    expect(didDoc.assertionMethod).toBeUndefined()

    expect(didDoc.capabilityDelegation).toBeUndefined()

    expect(didDoc.verificationMethod).toHaveLength(1)
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${didDetails.did}#authentication`,
      controller: didDetails.did,
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyBase58: base58Encode(authenticationDidKeyDetails.publicKey),
    })

    expect(didDoc.service).toBeUndefined()
  })

  it('exports the expected application/ld+json W3C DID Document with only an authentication key', () => {
    authenticationDidKeyDetails = {
      publicKey: authPublicKey,
      type: 'sr25519',
    }
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/ld+json')

    expect(didDoc.id).toMatch(didDetails.did)

    expect(didDoc['@context']).toHaveLength(1)
    expect(didDoc['@context']).toContainEqual('https://www.w3.org/ns/did/v1')

    expect(didDoc.authentication).toHaveLength(1)
    expect(didDoc.authentication).toContainEqual(
      `${didDetails.did}#authentication`
    )

    expect(didDoc.keyAgreement).toBeUndefined()

    expect(didDoc.assertionMethod).toBeUndefined()

    expect(didDoc.capabilityDelegation).toBeUndefined()

    expect(didDoc.verificationMethod).toHaveLength(1)
    expect(didDoc.verificationMethod).toContainEqual({
      id: `${didDetails.did}#authentication`,
      controller: didDetails.did,
      type: 'Sr25519VerificationKey2020',
      publicKeyBase58: base58Encode(authenticationDidKeyDetails.publicKey),
    })

    expect(didDoc.service).toBeUndefined()
  })

  it('does not export a DID Document with an unsupported format', () => {
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    expect(() => exportToDidDocument(didDetails, 'text/html')).toThrow()
  })
})

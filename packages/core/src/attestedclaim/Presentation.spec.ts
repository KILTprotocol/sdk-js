/**
 * @group unit/presentation
 */

import { Crypto } from '@kiltprotocol/utils'
import AttestedClaim from './AttestedClaim'
import RequestForAttestation from '../requestforattestation'
import Identity from '../identity'
import { Presentation, SignedPresentation } from './Presentation'
import Attestation from '../attestation/Attestation'

let attestedClaim: AttestedClaim
let alice: Identity
let bob: Identity

beforeAll(() => {
  alice = Identity.buildFromURI('//Alice')
  bob = Identity.buildFromURI('//Bob')

  const cTypeHash = Crypto.hashStr('TestCType!')
  const request = RequestForAttestation.fromClaimAndIdentity(
    {
      cTypeHash,
      contents: {
        a: 'a',
        b: 1,
        c: true,
      },
      owner: alice.address,
    },
    alice
  )

  attestedClaim = AttestedClaim.fromRequestAndAttestation(request, {
    owner: bob.address,
    delegationId: null,
    cTypeHash,
    claimHash: request.rootHash,
    revoked: false,
  })
})

it('creates signed presentation', () => {
  const presentation = Presentation.fromAttestedClaim(attestedClaim, {
    signer: alice,
    challenge: 'abc',
  })
  expect(presentation).toMatchObject<Partial<SignedPresentation>>({
    presentationSignature: expect.any(String),
    verifierChallenge: 'abc',
  })
  expect(presentation.isSigned()).toBe(true)
  expect(presentation.verifyData()).toBe(true)
})

it('does not verify if signer != owner', () => {
  const presentation = Presentation.fromAttestedClaim(attestedClaim, {
    signer: bob,
    challenge: 'abc',
  })
  expect(presentation).toMatchObject<Partial<SignedPresentation>>({
    presentationSignature: expect.any(String),
    verifierChallenge: 'abc',
  })
  expect(presentation.isSigned()).toBe(true)
  expect(presentation.verifyData()).toBe(false)
})

it('does not verify if nonce was changed after signing', () => {
  const presentation = Presentation.fromAttestedClaim(attestedClaim, {
    signer: alice,
    challenge: 'abc',
  })
  presentation.verifierChallenge = 'aaa'
  expect(presentation).toMatchObject<Partial<SignedPresentation>>({
    presentationSignature: expect.any(String),
    verifierChallenge: 'aaa',
  })
  expect(presentation.isSigned()).toBe(true)
  expect(presentation.verifyData()).toBe(false)
})

it('creates reduced presentations without changing the original', () => {
  // freeze attested claim for later comparison
  const attestedClaimJson = JSON.stringify(attestedClaim)

  let presentation = Presentation.fromAttestedClaim(attestedClaim, {
    hideAttributes: ['a'],
  })
  expect(presentation.request.claim.contents).not.toHaveProperty('a')
  expect(presentation.getAttributes()).toEqual(new Set(['b', 'c']))
  expect(presentation.verifyData()).toBe(true)

  presentation = Presentation.fromAttestedClaim(attestedClaim, {
    showAttributes: ['a'],
  })
  expect(presentation.request.claim.contents).toEqual({ a: 'a' })
  expect(presentation.getAttributes()).toEqual(new Set(['a']))
  expect(presentation.verifyData()).toBe(true)
  // attested claim still the same?
  expect(JSON.stringify(attestedClaim)).toEqual(attestedClaimJson)
})

it('verifies signed reduced presentations', () => {
  const presentation = Presentation.fromAttestedClaim(attestedClaim, {
    hideAttributes: ['a'],
    signer: alice,
    challenge: 'abc',
  })
  expect(presentation.request.claim.contents).not.toHaveProperty('a')
  expect(presentation.getAttributes()).toEqual(new Set(['b', 'c']))
  expect(presentation.verifyData()).toBe(true)
})

it('verifies signature when calling verify', () => {
  const mock = jest.spyOn(Attestation, 'checkValidity')
  mock.mockImplementation(async () => true)

  let presentation = Presentation.fromAttestedClaim(attestedClaim, {
    signer: alice,
    challenge: 'abc',
  })
  const spy = jest.spyOn(presentation, 'verifySignature')
  expect(presentation.isSigned()).toBe(true)
  expect(presentation.verify()).resolves.toBe(true)
  expect(spy).toHaveBeenCalled()

  presentation = Presentation.fromAttestedClaim(attestedClaim, {
    signer: bob,
    challenge: 'abc',
  })
  expect(presentation.isSigned()).toBe(true)
  expect(presentation.verify()).resolves.toBe(false)
})

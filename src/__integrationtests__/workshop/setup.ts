/* eslint-disable jsdoc/require-returns */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */

/**
 * This file runs through the whole process from creating a claim, attesting and verifying it.
 * It's used as a setup to keep copy-paste blocks clean.
 */

import * as Kilt from '../../index'
import ctype from './2_ctypeFromSchema'
import { wannabeFaucet, CtypeOnChain } from '../utils'

// constants
export const nonce = '3a66fc28-379c-4443-9537-a00169fd76a4'
export const signedNonce =
  '0x007f6f168bc6f0eda62b3af50bb86a1e5043fa33ec6e44e21ea66c6edda2a51d57de844c3105943a79bfad3851e056687566ee47fac58384a6fb92aaa8c0561800'
export const attestedClaimJSONString =
  '{"request":{"claim":{"cTypeHash":"0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5","contents":{"name":"Alice","age":25},"owner":"5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E"},"claimOwner":{"nonce":"ad7935b2-6e3c-4e2c-8437-3e5ea956d12e","hash":"0x3a463e6395762fcb06997560a77472bdb5b83ddde7b938eb6635cb5d3eb6fdbb"},"cTypeHash":{"nonce":"bb5e2cc9-b703-4701-91a2-40172fa40fa6","hash":"0xe80c3fd8dd7c3bbdafd0dd0e012006a3bdc1b42856ac70337178780b15c2a121"},"legitimations":[],"delegationId":null,"claimHashTree":{"name":{"nonce":"9c0ffa36-87fd-4880-87ca-1c5377fc3af2","hash":"0x909656276e1a8d1cf78b2d92c984b125b9a1224d37197f67f64bdbb0fdb79aff"},"age":{"nonce":"6b1cab69-a204-433b-9ae2-935d9c9da410","hash":"0x19ed5ccfb988d71812154fb4c519e1081134940ec7ad28cb55fd32c11d041cec"}},"rootHash":"0xe98671c41a7ee662ddc72e25e120bdd364a627dc1bfaac875141fc29e6cd51d1","claimerSignature":"0x00af688b7604f34bd2ec087449fa3526c1730f326a1355bd95a8ab0cf80fa8d0ab786b35e4bac12ceccc72f315a8fe3842cb7ad28966a9c9c44ee26700ca69d30b","privacyEnhancement":null},"attestation":{"claimHash":"0xe98671c41a7ee662ddc72e25e120bdd364a627dc1bfaac875141fc29e6cd51d1","cTypeHash":"0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5","delegationId":null,"owner":"5HTEzvVT5bQxJTYPiDhRUw4GHarQVs66sFQEpQDUNT6MyoJr","revoked":false}}'
export const dataToVerifyJSONString = JSON.stringify({
  signedNonce,
  attestedClaimStruct: JSON.parse(attestedClaimJSONString),
})

/**
 * Creates all necessary identities and objects for attesting a claim until you would have to touch the chain.
 * The last step is [[RequestForAttestation.fromRequestAndPublicIdentity]].
 * After that you would have to connect to the chain and store the attestation.
 *
 * Note: Some of the returned data fields are only necessary for specific workshop steps.
 */
export async function setup(): Promise<{
  claimer: Kilt.Identity
  claim: Kilt.Claim
  attester: Kilt.Identity
  requestForAttestation: Kilt.RequestForAttestation
  requestForAttestationJSONString: string
  requestForAttestationStruct: Kilt.RequestForAttestation
  attestation: Kilt.Attestation
  attestedClaim: Kilt.AttestedClaim
}> {
  // claim
  const claimer = await Kilt.Identity.buildFromURI('//Bob')
  const claimContents = {
    name: 'Alice',
    age: 25,
  }
  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    claimContents,
    claimer.getAddress()
  )

  // request for attestation
  const {
    message: requestForAttestation,
  } = await Kilt.RequestForAttestation.fromClaimAndIdentity(claim, claimer)
  const requestForAttestationJSONString = JSON.stringify(requestForAttestation)
  const requestForAttestationStruct = JSON.parse(
    JSON.stringify(requestForAttestation)
  )

  // attestation
  const attester = await wannabeFaucet

  if (!(await CtypeOnChain(ctype))) {
    console.log('Missing CTPYE on chain, storing now...')
    await ctype.store(attester)
  }

  const isDataValid = requestForAttestation.verifyData()
  const isSignatureValid = requestForAttestation.verifySignature()
  if (!isDataValid || !isSignatureValid)
    throw new Error(
      `Data and signature should be valid: data ${isDataValid}, signature ${isSignatureValid}`
    )
  const attestation = Kilt.Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )
  const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    attestation
  )
  console.log('attestedClaimJSONString:\n', JSON.stringify(attestedClaim))
  return {
    claimer,
    claim,
    attester,
    requestForAttestation,
    requestForAttestationJSONString,
    requestForAttestationStruct,
    attestation,
    attestedClaim,
  }
}

export default setup

// export async function getAttestedClaim(attester: Kilt.Identity, attestation: Kilt.Attestation) {
//   await
// }

import { blake2AsHex } from '@polkadot/util-crypto'
import jsonld from 'jsonld'
import { IRequestForAttestation } from '@kiltprotocol/core'
import { Hasher } from '@kiltprotocol/core/lib/crypto'
import {
  VerifiableCredential,
  revealPropertyProof,
  KILT_REVEAL_PROPERTY_TYPE,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLEPRESENTATION_TYPE,
  VerifiablePresentation,
} from './types'

/**
 * This proof is added to a credential to prove that revealed properties were attested in the original credential.
 * For each property to be revealed, it contains an unsalted hash of the statement plus a nonce which is required to verify against the salted hash in the credential.
 * Statements and nonces are mapped to each other through the unsalted hashes.
 *
 * @param credential VerifiableCredential object containing only the credentialSubject properties you want to reveal.
 * @param claimNonceMap The nonce map used to derive nonces from; will be filtered. Can be taken from a VC or Kilt claim.
 * @param options Options.
 * @param options.hasher The hashing function used to generate digests for nonce map. Should be the one used in creating the original credential.
 * @returns Proof object that can be included in a Verifiable Credential / Verifiable Presentation's proof section.
 */
export async function recreateRevealPropertiesProof(
  credential: VerifiableCredential,
  claimNonceMap: IRequestForAttestation['claimNonceMap'],
  options: { hasher?: Hasher } = {}
): Promise<revealPropertyProof> {
  const {
    hasher = (value, nonce?) => blake2AsHex((nonce || '') + value, 256),
  } = options

  // recreate statement digests from partial claim to identify required nonces
  const claimNonces = {}
  const expanded = await jsonld.compact(credential.credentialSubject, {})
  const statements = Object.entries(expanded).map(([key, value]) =>
    JSON.stringify({ [key]: value })
  )
  if (statements.length < 1)
    throw new Error(
      `no statements extracted from ${JSON.stringify(
        credential.credentialSubject
      )}`
    )
  statements.forEach((stmt) => {
    const digest = hasher(stmt)
    if (Object.keys(claimNonceMap).includes(digest)) {
      claimNonces[digest] = claimNonceMap[digest]
    } else {
      throw new Error(`nonce missing for ${stmt}`)
    }
  })

  // return the proof containing nonces which can be mapped via an unsalted hash of the statement
  return {
    type: KILT_REVEAL_PROPERTY_TYPE,
    nonces: claimNonces,
  }
}

/**
 * Returns a copy of a KILT Verifiable Credential where all claims about the credential subject that are not whitelisted have been removed.
 *
 * @param VC The KILT Verifiable Credential as exported with the SDK utils.
 * @param whitelist An array of properties to keep on the credential.
 * @returns A Verifiable Credential containing the original proofs, but with non-whitelisted claims removed.
 */
export async function removeProperties(
  VC: VerifiableCredential,
  whitelist: string[]
): Promise<VerifiableCredential> {
  // copy credential
  const copied: VerifiableCredential = JSON.parse(JSON.stringify(VC))
  // remove non-revealed props
  Object.keys(copied.credentialSubject).forEach((key) => {
    if (!(key.startsWith('@') || whitelist.includes(key)))
      delete copied.credentialSubject[key]
  })
  // find old proof
  let proofs = copied.proof instanceof Array ? copied.proof : [copied.proof]
  const oldClaimsProof = proofs.filter(
    (p) => p.type === KILT_REVEAL_PROPERTY_TYPE
  )
  if (oldClaimsProof.length !== 1)
    throw new Error(
      `expected exactly one proof of type ${KILT_REVEAL_PROPERTY_TYPE}`
    )
  proofs = proofs.filter((p) => p.type !== KILT_REVEAL_PROPERTY_TYPE)
  // compute new (reduced) proof
  proofs.push(
    await recreateRevealPropertiesProof(copied, oldClaimsProof[0].nonces)
  )
  copied.proof = proofs
  return copied
}

/**
 * Creates a Verifiable Presentation from a KILT Verifiable Credential and allows removing properties while doing so. Does not currently sign the presentation or allow adding a challenge to be signed.
 *
 * @param VC The KILT Verifiable Credential as exported with the SDK utils.
 * @param showProperties An array of properties to reveal.
 * @returns A Verifiable Presentation containing the original VC with its proofs, but not extra signatures.
 */
export async function makePresentation(
  VC: VerifiableCredential,
  showProperties: string[]
): Promise<VerifiablePresentation> {
  const copied = await removeProperties(VC, showProperties)
  return {
    '@context': [DEFAULT_VERIFIABLECREDENTIAL_CONTEXT],
    type: [DEFAULT_VERIFIABLEPRESENTATION_TYPE],
    verifiableCredential: copied,
    holder: copied.credentialSubject['@id'] as string,
    proof: [],
  }
}

export default {
  makePresentation,
  removeProperties,
  recreateRevealPropertiesProof,
}

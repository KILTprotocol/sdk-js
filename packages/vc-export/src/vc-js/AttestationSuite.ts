import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import {
  DocumentLoader,
  ExpansionMap,
  Proof,
  purposes,
  suites,
  VerificationResult,
} from 'jsonld-signatures'
import { JsonLdObj } from 'jsonld/jsonld-spec'
import { Attestation } from '@kiltprotocol/core'
import {
  AttestedProof,
  KILT_ATTESTED_PROOF_TYPE,
  VerifiableCredential,
} from '../types'
import { verifyAttestedProof, AttestationStatus } from '../verificationUtils'

class AttestationError extends Error {
  public readonly attestationStatus: AttestationStatus

  constructor(message: string, attestationStatus: AttestationStatus) {
    super(message)
    this.name = 'AttestationError'
    this.attestationStatus = attestationStatus
  }
}

export default class KiltAttestedProof extends suites.LinkedDataProof {
  private readonly provider: Blockchain
  constructor(options: { KiltConnection: Blockchain }) {
    super({ type: KILT_ATTESTED_PROOF_TYPE })
    if (
      !options.KiltConnection ||
      !(options.KiltConnection instanceof Blockchain)
    )
      throw new TypeError('KiltConnection must be a Kilt blockchain connection')
    this.provider = options.KiltConnection
  }

  private setConnection() {
    BlockchainApiConnection.setConnection(Promise.resolve(this.provider))
  }

  public async verifyProof(options: {
    proof: Proof
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<VerificationResult> {
    try {
      const { document, proof } = options
      if (!document || typeof document !== 'object')
        throw new TypeError('document must be a JsonLd object')
      if (!proof || typeof proof !== 'object')
        throw new TypeError('proof must be a JsonLd object')
      this.setConnection()
      const { verified, errors, status } = await verifyAttestedProof(
        document as VerifiableCredential,
        proof as AttestedProof
      )
      if (errors.length > 0)
        return {
          verified,
          error: new AttestationError(errors[0].message, status),
        }
      return { verified }
    } catch (e) {
      return { verified: false, error: e }
    }
  }

  public async createProof(options: {
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<Proof> {
    const { document, purpose } = options
    if (!document || typeof document !== 'object')
      throw new TypeError('document must be a JsonLd object')
    const id: string = document['@id'] || document['id']
    if (!id || typeof id !== 'string')
      throw new Error('document must have an @id property')
    this.setConnection()
    const exists = await Attestation.query(id)
    if (!exists)
      throw new Error(
        'A credential with this id has not been attested in the Kilt network. Use @kiltprotocol/sdk-js to write attestations.'
      )
    return {
      type: this.type,
      proofPurpose: purpose?.term,
      attesterAddress: exists.owner,
    } as AttestedProof
  }
}

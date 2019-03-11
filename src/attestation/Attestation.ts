/**
 * @module Attestation
 */
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic from '@polkadot/api/SubmittableExtrinsic'
import { ExtrinsicStatus } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import Blockchain from '../blockchain/Blockchain'
import { BlockchainStorable } from '../blockchain/BlockchainStorable'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { IRequestForAttestation } from '../requestforattestation/RequestForAttestation'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from 'src/identity/PublicIdentity'
import { IDelegationBaseNode } from 'src/delegation/Delegation'

const log = factory.getLogger('Attestation')

export interface IAttestation {
  claimHash: string
  ctypeHash: ICType['hash']
  owner: IPublicIdentity['address']
  revoked: boolean
  delegationId?: IDelegationBaseNode['id']
}

export default class Attestation extends BlockchainStorable<Attestation[]>
  implements IAttestation {
  /**
   * Creates a new instance of this Attestation class from the given interface.
   */
  public static fromObject(obj: IAttestation): Attestation {
    const newAttestation: Attestation = Object.create(Attestation.prototype)
    return Object.assign(newAttestation, obj)
  }
  public claimHash: string
  public ctypeHash: string
  public owner: IPublicIdentity['address']
  public revoked: boolean
  public delegationId?: IDelegationBaseNode['id']

  constructor(
    requestForAttestation: IRequestForAttestation,
    attester: Identity,
    revoked = false
  ) {
    super()
    this.owner = attester.address
    this.claimHash = requestForAttestation.hash
    this.ctypeHash = requestForAttestation.ctypeHash.hash
    this.revoked = revoked
  }

  public async revoke(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<ExtrinsicStatus> {
    log.debug(() => `Revoking attestations with hash ${this.getHash()}`)
    const signature = identity.sign(this.getHash())
    const extrinsic: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = blockchain.api.tx.attestation.revoke(this.getHash(), signature)
    return super.submitToBlockchain(blockchain, identity, extrinsic)
  }

  public async verify(
    blockchain: Blockchain,
    claimHash: string = this.claimHash
  ): Promise<boolean> {
    // 1) Query attestations for claimHash
    const attestations: Attestation[] = await this.query(blockchain, claimHash)
    // 2) Find non-revoked attestation by this attestations' owner
    const verifiedAttestation = attestations.find(
      (attestation: Attestation) => {
        return attestation.owner === this.owner && !attestation.revoked
      }
    )
    const attestationValid: boolean = verifiedAttestation !== undefined
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }

  public getHash(): string {
    return this.claimHash
  }

  protected async createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    log.debug(
      () =>
        `Initializing transaction 'attestation.add' for claim hash '${this.getHash()}'`
    )
    // TODO: Does this work? Third (optional) parameter Option<DelegationNodeId> is missing!
    return blockchain.api.tx.attestation.add(
      this.getHash(),
      this.ctypeHash,
      this.delegationId
    )
  }

  protected async queryRaw(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined> {
    log.debug(() => `Query chain for attestations with claim hash ${hash}`)
    const result:
      | Codec
      | null
      | undefined = await blockchain.api.query.attestation.attestations(hash)
    log.debug(() => `Result: ${result}`)
    return result
  }

  protected decode(
    encoded: Codec | null | undefined,
    hash: string
  ): Attestation[] {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    let attestations: Attestation[] = []
    if (json instanceof Array) {
      attestations = json
        .map((attestationTuple: any) => {
          return {
            claimHash: hash,
            ctypeHash: attestationTuple[0],
            owner: attestationTuple[1],
            // delegationId: attestationTuple[2],
            revoked: attestationTuple[3],
          } as IAttestation
        })
        .map((iAttestation: IAttestation) => {
          return Attestation.fromObject(iAttestation)
        })
    }
    return attestations
  }
}

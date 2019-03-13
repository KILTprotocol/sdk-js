/**
 * @module Attestation
 */
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic from '@polkadot/api/SubmittableExtrinsic'
import { ExtrinsicStatus, Option, Text } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import Blockchain from '../blockchain/Blockchain'
import { BlockchainStorable } from '../blockchain/BlockchainStorable'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import { IRequestForAttestation } from '../requestforattestation/RequestForAttestation'
import { ICType } from '../ctype/CType'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { IDelegationBaseNode } from '../delegation/Delegation'

const log = factory.getLogger('Attestation')

export interface IAttestation {
  claimHash: string
  cTypeHash: ICType['hash']
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
  public cTypeHash: string
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
    this.cTypeHash = requestForAttestation.claim.cType
    this.revoked = revoked
  }

  public async revoke(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<ExtrinsicStatus> {
    log.debug(
      () => `Revoking attestations with claim hash ${this.getIdentifier()}`
    )
    const extrinsic: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = blockchain.api.tx.attestation.revoke(this.getIdentifier())
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

  public getIdentifier(): string {
    return this.claimHash
  }

  protected async createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>> {
    const txParams = {
      claimHash: this.getIdentifier(),
      ctypeHash: this.cTypeHash,
      delegationId: new Option(Text, this.delegationId),
    }
    log.debug(() => `Create tx for 'attestation.add'`)
    // @ts-ignore
    return blockchain.api.tx.attestation.add(
      txParams.claimHash,
      txParams.ctypeHash,
      txParams.delegationId
    )
  }

  protected async queryRaw(
    blockchain: Blockchain,
    identifier: string
  ): Promise<Codec | null | undefined> {
    log.debug(
      () => `Query chain for attestations with claim hash ${identifier}`
    )
    const result:
      | Codec
      | null
      | undefined = await blockchain.api.query.attestation.attestations(
      identifier
    )
    return result
  }

  protected decode(
    encoded: Codec | null | undefined,
    identifier: string
  ): Attestation[] {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    let attestations: IAttestation[] = []
    if (json instanceof Array) {
      attestations = json.map((attestationTuple: any) => {
        return {
          claimHash: identifier,
          cTypeHash: attestationTuple[0],
          owner: attestationTuple[1],
          delegationId: attestationTuple[2],
          revoked: attestationTuple[3],
        } as IAttestation
      })
    }
    log.info(`Decoded attestations: ${JSON.stringify(attestations)}`)
    return attestations.map((iAttestation: IAttestation) => {
      return Attestation.fromObject(iAttestation)
    })
  }
}

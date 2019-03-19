/**
 * @module Attestation
 */
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic from '@polkadot/api/SubmittableExtrinsic'
import { Option, Text } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { TxStatus } from '../blockchain/TxStatus'
import Blockchain from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import { ICType } from '../ctype/CType'
import { IDelegationBaseNode } from '../delegation/Delegation'
import Identity from '../identity/Identity'
import { IPublicIdentity } from '../identity/PublicIdentity'
import { IRequestForAttestation } from '../requestforattestation/RequestForAttestation'

const log = factory.getLogger('Attestation')

export interface IAttestation {
  claimHash: string
  cTypeHash: ICType['hash']
  owner: IPublicIdentity['address']
  revoked: boolean
  delegationId?: IDelegationBaseNode['id']
}

export default class Attestation implements IAttestation {
  /**
   * Creates a new instance of this Attestation class from the given interface.
   */
  public static fromObject(obj: IAttestation): Attestation {
    const newAttestation: Attestation = Object.create(Attestation.prototype)
    return Object.assign(newAttestation, obj)
  }
  public claimHash: string
  public cTypeHash: ICType['hash']
  public owner: IPublicIdentity['address']
  public revoked: boolean
  public delegationId?: IDelegationBaseNode['id']

  constructor(
    requestForAttestation: IRequestForAttestation,
    attester: Identity,
    revoked = false
  ) {
    this.owner = attester.address
    this.claimHash = requestForAttestation.hash
    this.cTypeHash = requestForAttestation.claim.cType
    this.revoked = revoked
  }

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    const txParams = {
      claimHash: this.claimHash,
      ctypeHash: this.cTypeHash,
      delegationId: new Option(Text, this.delegationId),
    }
    log.debug(() => `Create tx for 'attestation.add'`)
    // @ts-ignore
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.attestation.add(
      txParams.claimHash,
      txParams.ctypeHash,
      txParams.delegationId
    )
    return blockchain.submitTx(identity, tx)
  }

  public async revoke(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(() => `Revoking attestations with claim hash ${this.claimHash}`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = blockchain.api.tx.attestation.revoke(this.claimHash)
    return blockchain.submitTx(identity, tx)
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

  public async query(
    blockchain: Blockchain,
    claimHash: string
  ): Promise<Attestation[]> {
    const encoded = await this.queryRaw(blockchain, claimHash)
    try {
      return this.decode(encoded, claimHash)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  protected async queryRaw(
    blockchain: Blockchain,
    claimHash: string
  ): Promise<Codec | null | undefined> {
    log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
    const result:
      | Codec
      | null
      | undefined = await blockchain.api.query.attestation.attestations(
      claimHash
    )
    return result
  }

  protected decode(
    encoded: Codec | null | undefined,
    claimHash: string
  ): Attestation[] {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    let attestations: IAttestation[] = []
    if (json instanceof Array) {
      attestations = json.map((attestationTuple: any) => {
        return {
          claimHash,
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

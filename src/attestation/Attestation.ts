/**
 * @module Attestation
 */
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import { Option, Text } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { TxStatus } from '../blockchain/TxStatus'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
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

  public static async query(
    blockchain: Blockchain,
    claimHash: string
  ): Promise<Attestation | undefined> {
    const encoded: QueryResult = await Attestation.queryRaw(
      blockchain,
      claimHash
    )
    return Attestation.decode(encoded, claimHash)
  }

  public static revoke(
    blockchain: Blockchain,
    claimHash: string,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = blockchain.api.tx.attestation.revoke(claimHash)
    return blockchain.submitTx(identity, tx)
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
    this.delegationId = requestForAttestation.delegationId
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
    return Attestation.revoke(blockchain, this.claimHash, identity)
  }

  public async verify(
    blockchain: Blockchain,
    claimHash: string = this.claimHash
  ): Promise<boolean> {
    // 1) Query attestations for claimHash
    const attestation: Attestation | undefined = await Attestation.query(
      blockchain,
      claimHash
    )
    // 2) check attestation for being valied, having the correct owner and not being revoked
    const attestationValid: boolean =
      attestation !== undefined &&
      attestation.owner === this.owner &&
      !attestation.revoked
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }

  protected static async queryRaw(
    blockchain: Blockchain,
    claimHash: string
  ): Promise<Codec | null | undefined> {
    log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
    const result: QueryResult = await blockchain.api.query.attestation.attestations(
      claimHash
    )
    return result
  }

  protected static decode(
    encoded: QueryResult,
    claimHash: string
  ): Attestation | undefined {
    if (encoded && encoded.encodedLength) {
      const attestationTuple = encoded.toJSON()
      const attestation: IAttestation = {
        claimHash,
        cTypeHash: attestationTuple[0],
        owner: attestationTuple[1],
        delegationId: attestationTuple[2],
        revoked: attestationTuple[3],
      } as IAttestation
      log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
      return Attestation.fromObject(attestation)
    }
    return undefined
  }
}

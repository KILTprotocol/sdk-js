import { SubmittableExtrinsic } from '@polkadot/api'
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import { Option, Text } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { Identity } from 'src'
import { IDelegationBaseNode } from 'src/delegation/Delegation'
import { IPublicIdentity } from 'src/identity/PublicIdentity'
import { IRequestForAttestation } from 'src/requestforattestation/RequestForAttestation'
import { factory } from '../config/ConfigLog'
import { BlockchainApi } from './BlockchainApi'
import { BlockchainApiConnection } from './BlockchainApiConnection'
import { TxStatus } from './TxStatus'

const log = factory.getLogger('Attestation')

interface IAttestation {
  claimHash: string
  cTypeHash: string
  owner: IPublicIdentity['address']
  delegationId?: IDelegationBaseNode['id']
  revoked: boolean

  store(identity: Identity): Promise<TxStatus>
  revoke(identity: Identity): Promise<TxStatus>
  verify(): Promise<boolean>
}

class Attestation implements IAttestation {
  public static decode(
    encoded: Codec | null | undefined,
    claimHash: string
  ): IAttestation[] {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    return json
      .map((attestationTuple: any) => {
        return {
          claimHash,
          cTypeHash: attestationTuple[0],
          owner: attestationTuple[1],
          delegationId: attestationTuple[2],
          revoked: attestationTuple[3],
        } as IAttestation
      })
      .map((iAttestation: IAttestation) => {
        const newAttestation: Attestation = Object.create(Attestation.prototype)
        return Object.assign(newAttestation, iAttestation)
      })
      .find((e: any) => true)
  }

  public claimHash: string
  public cTypeHash: string
  public owner: IPublicIdentity['address']
  public delegationId?: IDelegationBaseNode['id']
  public revoked: boolean

  constructor(
    requestForAttestation: IRequestForAttestation,
    attester: Identity,
    revoked: boolean = false
  ) {
    this.owner = attester.address
    this.claimHash = requestForAttestation.hash
    this.cTypeHash = requestForAttestation.claim.cType
    this.revoked = revoked
  }

  public async store(identity: Identity): Promise<TxStatus> {
    const txParams = {
      claimHash: this.claimHash,
      ctypeHash: this.cTypeHash,
      delegationId: new Option(Text, this.delegationId),
    }
    log.debug(() => `Create tx for 'attestation.add'`)
    const blockchain: BlockchainApi = await BlockchainApiConnection.get()
    // @ts-ignore
    const tx: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = blockchain.api.tx.attestation.add(
      txParams.claimHash,
      txParams.ctypeHash,
      txParams.delegationId
    )
    return blockchain.submitTx(identity, tx)
  }

  public async revoke(identity: Identity): Promise<TxStatus> {
    const blockchain: BlockchainApi = await BlockchainApiConnection.get()
    log.debug(() => `Revoking attestations with claim hash ${this.claimHash}`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      SubscriptionResult
    > = blockchain.api.tx.attestation.revoke(this.claimHash)
    return blockchain.submitTx(identity, tx)
  }

  public async verify(): Promise<boolean> {
    const blockchain: BlockchainApi = await BlockchainApiConnection.get()
    const result:
      | Codec
      | null
      | undefined = await blockchain.api.query.attestation.attestations(
      this.claimHash
    )
    const attestations: IAttestation[] = Attestation.decode(
      result,
      this.claimHash
    )

    const verifiedAttestation = attestations.find(
      (attestation: IAttestation) => {
        let delegationIdMatches: boolean = true
        if (this.delegationId) {
          delegationIdMatches = this.delegationId === attestation.delegationId
        }
        return (
          attestation.owner === this.owner &&
          !attestation.revoked &&
          delegationIdMatches
        )
      }
    )
    const attestationValid: boolean = verifiedAttestation !== undefined
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }
}

export { Attestation, IAttestation }

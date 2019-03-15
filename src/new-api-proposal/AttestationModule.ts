import { Codec } from '@polkadot/types/types'
import { Identity, PublicIdentity } from 'src'
import { IDelegationBaseNode } from 'src/delegation/Delegation'
import { IRequestForAttestation } from 'src/requestforattestation/RequestForAttestation'
import { factory } from '../config/ConfigLog'
import { Attestation, IAttestation } from './Attestation'
import { TxStatus } from './TxStatus'
import { IBlockchainApi } from './BlockchainApi'

const log = factory.getLogger('Attestation')

export class AttestationModule {
  constructor(private blockchain: IBlockchainApi) {}

  public create(
    requestForAttestation: IRequestForAttestation,
    attester: Identity,
    revoked: boolean = false
  ): IAttestation {
    return new Attestation(requestForAttestation, attester)
  }

  public async query(claimHash: string): Promise<IAttestation[]> {
    const result:
      | Codec
      | null
      | undefined = await this.blockchain.api.query.attestation.attestations(
      claimHash
    )
    return Attestation.decode(result, claimHash)
  }

  /**
   * Checks if there is a non-revoked attestation for `claimHash` attested by `attester` on chain.
   */
  public async verify(
    claimHash: string,
    attester: PublicIdentity['address']
  ): Promise<boolean> {
    const attestations: IAttestation[] = await this.query(claimHash)
    const verifiedAttestation = attestations.find(
      (attestation: Attestation) => {
        return attestation.owner === attester && !attestation.revoked
      }
    )
    const attestationValid: boolean = verifiedAttestation !== undefined
    if (!attestationValid) {
      log.debug(() => 'No valid attestation found')
    }
    return Promise.resolve(attestationValid)
  }

  public async revokeAll(
    delegationId: IDelegationBaseNode['id']
  ): Promise<TxStatus> {
    return Promise.resolve({} as TxStatus)
  }
}

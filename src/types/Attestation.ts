/**
 * @packageDocumentation
 * @module IAttestation
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'
import { IDelegationBaseNode } from './Delegation'
import Attestation from '../attestation/Attestation'

export default interface IAttestation {
  claimHash: string
  cTypeHash: ICType['hash']
  owner: IPublicIdentity['address']
  delegationId: IDelegationBaseNode['id'] | null
  revoked: boolean
}

export type CompressedAttestation = [
  Attestation['claimHash'],
  Attestation['cTypeHash'],
  Attestation['owner'],
  Attestation['revoked'],
  Attestation['delegationId']
]

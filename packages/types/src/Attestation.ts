/**
 * @packageDocumentation
 * @module IAttestation
 */
import Attestation from '../attestation/Attestation'
import ICType from './CType'
import { IDelegationBaseNode } from './Delegation'
import IPublicIdentity from './PublicIdentity'

export default interface IAttestation {
  claimHash: string
  cTypeHash: ICType['hash']
  owner: IPublicIdentity['address']
  delegationId: IDelegationBaseNode['id'] | null
  revoked: boolean
}

export type CompressedAttestation = [
  IAttestation['claimHash'],
  IAttestation['cTypeHash'],
  IAttestation['owner'],
  IAttestation['revoked'],
  IAttestation['delegationId']
]

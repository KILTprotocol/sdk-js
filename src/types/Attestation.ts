/**
 * @packageDocumentation
 * @module IAttestation
 */
import * as gabi from '@kiltprotocol/portablegabi'
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

export interface IRevocableAttestation extends IAttestation {
  witness: gabi.Witness | null
}

export type CompressedAttestation = [
  Attestation['claimHash'],
  Attestation['cTypeHash'],
  Attestation['owner'],
  Attestation['revoked'],
  Attestation['delegationId']
]

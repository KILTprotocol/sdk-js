/**
 * @packageDocumentation
 * @module IAttestation
 */
import * as gabi from '@kiltprotocol/portablegabi'
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

export interface IRevocationHandle {
  attestation: IAttestation
  witness: gabi.Witness | null
}

export type CompressedAttestation = [
  Attestation['claimHash'],
  Attestation['cTypeHash'],
  Attestation['owner'],
  Attestation['revoked'],
  Attestation['delegationId']
]

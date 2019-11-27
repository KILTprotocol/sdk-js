/**
 * @module TypeInterfaces/Attestation
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'
import { IDelegationBaseNode } from './Delegation'

export default interface IAttestation {
  claimHash: string
  cTypeHash: ICType['hash']
  owner: IPublicIdentity['address']
  delegationId: IDelegationBaseNode['id'] | null
  revoked: boolean
}

/**
 * @module TypeInterfaces/Delegation
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import IPublicIdentity from './PublicIdentity'
import ICType from './CType'

/* eslint-disable no-bitwise, import/prefer-default-export */
export enum Permission {
  ATTEST = 1 << 0, // 0001
  DELEGATE = 1 << 1, // 0010
}
/* eslint-enable no-bitwise, import/prefer-default-export */

export interface IDelegationBaseNode {
  id: string
  account: IPublicIdentity['address']
  revoked: boolean
}

export interface IDelegationRootNode extends IDelegationBaseNode {
  cTypeHash: ICType['hash']
}

export interface IDelegationNode extends IDelegationBaseNode {
  rootId: IDelegationBaseNode['id']
  parentId?: IDelegationBaseNode['id']
  permissions: Permission[]
}

/**
 * @packageDocumentation
 * @module IDelegation
 */
import { ICType } from './CType'
import { IPublicIdentity } from './PublicIdentity'

/* eslint-disable no-bitwise */
export enum Permission {
  ATTEST = 1 << 0, // 0001
  DELEGATE = 1 << 1, // 0010
}

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

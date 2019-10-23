/**
 * @module SDK
 * @ignore
 */

/**
 * Dummy comment, so that typedoc ignores this file
 */
import { connect } from './kilt/Kilt'
import * as BlockchainApiConnection from './blockchainApiConnection'
import * as Balance from './balance/Balance.chain'
import Identity from './identity/Identity'
import PublicIdentity, { IURLResolver } from './identity/PublicIdentity'
import CType from './ctype/CType'
import * as CTypeUtils from './ctype/CTypeUtils'
import Claim from './claim/Claim'
import RequestForAttestation from './requestforattestation/RequestForAttestation'
import Attestation from './attestation/Attestation'
import AttestedClaim from './attestedclaim/AttestedClaim'
import DelegationBaseNode from './delegation/Delegation'
import DelegationNode from './delegation/DelegationNode'
import DelegationRootNode from './delegation/DelegationRootNode'
import Did, { IDid } from './did/Did'
import Message from './messaging/Message'
import {
  getAddressFromIdentifier,
  getIdentifierFromAddress,
} from './did/Did.utils'

export { default as Blockchain, IBlockchainApi } from './blockchain/Blockchain'
export { default as TxStatus } from './blockchain/TxStatus'
export { default as Crypto } from './crypto'
export { default as UUID } from './util/UUID'
export * from './errorhandling/ExtrinsicError'

const DidUtils = {
  getIdentifierFromAddress,
  getAddressFromIdentifier,
}

// ---- Types, which define the most basic KILT objects ----
export { default as IPublicIdentity } from './types/PublicIdentity'
export { default as ICType } from './types/CType'
export { default as IClaim } from './types/Claim'
export { default as IAttestedClaim } from './types/AttestedClaim'
export { default as IAttestation } from './types/Attestation'
export {
  default as IRequestForAttestation,
} from './types/RequestForAttestation'
export {
  IDelegationRootNode,
  IDelegationBaseNode,
  IDelegationNode,
  Permission,
} from './types/Delegation'

export {
  BlockchainApiConnection,
  Balance,
  Identity,
  PublicIdentity,
  IURLResolver,
  CType,
  CTypeUtils,
  Claim,
  RequestForAttestation,
  Attestation,
  AttestedClaim,
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
  Did,
  DidUtils,
  IDid,
  Message,
}

export {
  CTypeModel,
  CTypeInputModel,
  CTypeWrapperModel,
} from './ctype/CTypeSchema'
export * from './messaging/Message'

// ---- Default export for ease of use ----
export default {
  connect,
  Balance,
  Identity,
  PublicIdentity,
  CType,
  Claim,
  RequestForAttestation,
  Attestation,
  AttestedClaim,
  DelegationNode,
  DelegationRootNode,
  Did,
  DidUtils,
  Message,
}

/**
 * @packageDocumentation
 * @ignore
 */

import { Accumulator, CombinedPresentation } from '@kiltprotocol/portablegabi'
import { connect, disconnect } from './kilt/Kilt'
import * as BlockchainApiConnection from './blockchainApiConnection'
import * as Balance from './balance/Balance.chain'
import AttesterIdentity from './attesteridentity/AttesterIdentity'
import Identity from './identity/Identity'
import PublicIdentity, { IURLResolver } from './identity/PublicIdentity'
import CType from './ctype/CType'
import CTypeMetadata from './ctype/CTypeMetadata'
import * as CTypeUtils from './ctype/CTypeUtils'
import * as CTypeSchema from './ctype/CTypeSchema'
import Claim from './claim/Claim'
import RequestForAttestation from './requestforattestation/RequestForAttestation'
import Attestation from './attestation/Attestation'
import AttestedClaim from './attestedclaim/AttestedClaim'
import DelegationBaseNode from './delegation/Delegation'
import DelegationNode from './delegation/DelegationNode'
import DelegationRootNode from './delegation/DelegationRootNode'
import Did, { IDid } from './did/Did'
import * as Quote from './quote/Quote'
import Message from './messaging/Message'
import * as Constants from './const'
import * as Verifier from './verifier/Verifier'

export { default as Blockchain, IBlockchainApi } from './blockchain/Blockchain'
export { default as TxStatus } from './blockchain/TxStatus'
export { default as Crypto } from './crypto'
export { default as UUID } from './util/UUID'
export { default as QuoteSchema } from './quote/QuoteSchema'
export * from './errorhandling/ExtrinsicError'
export * from './messaging/Message'

// ---- Types, which define the most basic KILT objects ----
export { default as IPublicIdentity } from './types/PublicIdentity'
export { default as ICType } from './types/CType'
export { default as ICTypeMetadata } from './types/CTypeMetadata'
export { default as IClaim } from './types/Claim'
export { default as IAttestedClaim } from './types/AttestedClaim'
export { default as IAttestation } from './types/Attestation'
export {
  IQuote,
  ICostBreakdown,
  IQuoteAttesterSigned,
  IQuoteAgreement,
} from './types/Quote'
export { default as ITerms } from './types/Terms'
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
  AttesterIdentity,
  BlockchainApiConnection,
  Balance,
  Identity,
  PublicIdentity,
  IURLResolver,
  CType,
  CTypeMetadata,
  CTypeUtils,
  CTypeSchema,
  Claim,
  RequestForAttestation,
  Attestation,
  AttestedClaim,
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
  Did,
  IDid,
  Message,
  Constants,
  Quote,
  Verifier,
  Accumulator,
  CombinedPresentation,
}

// ---- Default export for ease of use ----
export default {
  AttesterIdentity,
  connect,
  disconnect,
  Balance,
  Identity,
  PublicIdentity,
  CType,
  CTypeMetadata,
  Claim,
  RequestForAttestation,
  Attestation,
  AttestedClaim,
  DelegationNode,
  DelegationRootNode,
  Did,
  Message,
  Verifier,
  Accumulator,
  CombinedPresentation,
}

/**
 * @packageDocumentation
 * @ignore
 */
import { Accumulator, CombinedPresentation } from '@kiltprotocol/portablegabi'
import { Attester, Claimer, Verifier } from './actor'
import Attestation, { AttestationUtils } from './attestation'
import AttestedClaim, { AttestedClaimUtils } from './attestedclaim'
import { Balance, BalanceUtils } from './balance'
import Blockchain, { IBlockchainApi, BlockchainUtils } from './blockchain'
import * as BlockchainApiConnection from './blockchainApiConnection'
import Claim, { ClaimUtils } from './claim'
import Credential from './credential'
import Crypto from './crypto'
import { CType, CTypeMetadata, CTypeSchema, CTypeUtils } from './ctype'
import {
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
} from './delegation'
import Did, { IDid, IDidDocument, IDidDocumentPublicKey } from './did'
import {
  AttesterIdentity,
  Identity,
  IURLResolver,
  PublicAttesterIdentity,
  PublicIdentity,
} from './identity'
import Message from './messaging'
import Quote, { QuoteSchema, QuoteUtils } from './quote'
import RequestForAttestation, {
  RequestForAttestationUtils,
} from './requestforattestation'

export { connect, disconnect } from './kilt'
export { SubmittableResult } from '@polkadot/api'
export { SubmittableExtrinsic } from '@polkadot/api/promise/types'
export * from './errorhandling'
export * from './messaging'
// ---- Types, which define the most basic KILT objects ----
export { default as IAttestation } from './types/Attestation'
export * from './types/Attestation'
export { default as IAttestedClaim } from './types/AttestedClaim'
export { default as IClaim } from './types/Claim'
export { default as ICredential } from './types/Credential'
export { default as ICType, CTypeSchemaWithoutId } from './types/CType'
export { default as ICTypeMetadata } from './types/CTypeMetadata'
export {
  IDelegationBaseNode,
  IDelegationNode,
  IDelegationRootNode,
  Permission,
} from './types/Delegation'
export { default as IPublicAttesterIdentity } from './types/PublicAttesterIdentity'
export { default as IPublicIdentity } from './types/PublicIdentity'
export {
  ICostBreakdown,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
} from './types/Quote'
export { default as IRequestForAttestation } from './types/RequestForAttestation'
export { default as ITerms } from './types/Terms'
export { UUID } from './util'
export {
  Blockchain,
  IBlockchainApi,
  BlockchainUtils,
  BlockchainApiConnection,
  Balance,
  BalanceUtils,
  Crypto,
  Identity,
  AttesterIdentity,
  PublicIdentity,
  PublicAttesterIdentity,
  IURLResolver,
  CType,
  CTypeMetadata,
  CTypeUtils,
  CTypeSchema,
  Claim,
  ClaimUtils,
  RequestForAttestation,
  RequestForAttestationUtils,
  Attestation,
  AttestationUtils,
  AttestedClaim,
  AttestedClaimUtils,
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
  Did,
  IDid,
  IDidDocument,
  IDidDocumentPublicKey,
  Message,
  Quote,
  Attester,
  Claimer,
  Verifier,
  Accumulator,
  CombinedPresentation,
  Credential,
  QuoteUtils,
  QuoteSchema,
}

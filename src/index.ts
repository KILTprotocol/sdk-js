/**
 * @packageDocumentation
 * @ignore
 */
import { Accumulator, CombinedPresentation } from '@kiltprotocol/portablegabi'
import { connect, disconnect } from './kilt'
import Blockchain, { IBlockchainApi } from './blockchain'
import * as BlockchainApiConnection from './blockchainApiConnection'
import * as Balance from './balance'
import Crypto from './crypto'
import {
  Identity,
  AttesterIdentity,
  PublicIdentity,
  PublicAttesterIdentity,
  IURLResolver,
} from './identity'
import { CType, CTypeMetadata, CTypeUtils, CTypeSchema } from './ctype'
import Claim, { ClaimUtils } from './claim'
import RequestForAttestation, {
  RequestForAttestationUtils,
} from './requestforattestation'
import Attestation, { AttestationUtils } from './attestation'
import AttestedClaim, { AttestedClaimUtils } from './attestedclaim'
import {
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
} from './delegation'
import Did, { IDid } from './did'
import Quote, { QuoteUtils, QuoteSchema } from './quote'
import Message from './messaging'
import * as Verifier from './actor/Verifier'
import * as Claimer from './actor/Claimer'
import * as Attester from './actor/Attester'
import Credential from './credential'

export { SubmittableResult } from '@polkadot/api'
export { UUID } from './util'
export * from './errorhandling'
export * from './messaging'

// ---- Types, which define the most basic KILT objects ----
export { default as IAttestation } from './types/Attestation'
export { default as IAttestedClaim } from './types/AttestedClaim'
export { default as IClaim } from './types/Claim'
export { default as ICredential } from './types/Credential'
export { default as ICType } from './types/CType'
export { default as ICTypeMetadata } from './types/CTypeMetadata'
export {
  IDelegationRootNode,
  IDelegationBaseNode,
  IDelegationNode,
  Permission,
} from './types/Delegation'
export {
  default as IPublicAttesterIdentity,
} from './types/PublicAttesterIdentity'
export { default as IPublicIdentity } from './types/PublicIdentity'
export {
  IQuote,
  ICostBreakdown,
  IQuoteAttesterSigned,
  IQuoteAgreement,
} from './types/Quote'
export {
  default as IRequestForAttestation,
} from './types/RequestForAttestation'
export { default as ITerms } from './types/Terms'

export {
  Blockchain,
  IBlockchainApi,
  BlockchainApiConnection,
  Balance,
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

// ---- Default export for ease of use ----
export default {
  connect,
  disconnect,
  Balance,
  Identity,
  AttesterIdentity,
  PublicIdentity,
  PublicAttesterIdentity,
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
  Claimer,
  Accumulator,
  CombinedPresentation,
  Attester,
  Credential,
}

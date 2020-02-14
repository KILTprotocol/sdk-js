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
import { Identity, PublicIdentity, IURLResolver } from './identity'
import AttesterIdentity from './attesteridentity/AttesterIdentity'
import { CType, CTypeMetadata, CTypeUtils, CTypeSchema } from './ctype'
import Claim from './claim'
import ClaimUtils from './claim/Claim.utils'
import RequestForAttestation from './requestforattestation'
import RequestForAttestationUtils from './requestforattestation/RequestForAttestation.utils'
import Attestation from './attestation'
import AttestationUtils from './attestation/Attestation.utils'
import AttestedClaim from './attestedclaim'
import AttestedClaimUtils from './attestedclaim/AttestedClaim.utils'
import {
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
} from './delegation'
import Did, { IDid } from './did'
import Quote, { QuoteSchema } from './quote'
import QuoteUtils from './quote/Quote.utils'
import Message from './messaging'
import * as Verifier from './actor/Verifier'
import * as Claimer from './actor/Claimer'
import * as Attester from './actor/Attester'
import Credential from './credential/Credential'

export { SubmittableResult } from '@polkadot/api'
export { UUID } from './util'
export * from './errorhandling'
export * from './messaging'

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
  Blockchain,
  IBlockchainApi,
  BlockchainApiConnection,
  Balance,
  Crypto,
  Identity,
  PublicIdentity,
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
  Claimer,
  Accumulator,
  CombinedPresentation,
  Attester,
  Credential,
}

/**
 * @packageDocumentation
 * @ignore
 */

import ICType, {
  ICTypeSchema,
  CTypeSchemaWithoutId,
  CompressedCTypeSchema,
  CompressedCType,
} from './CType'
import ICTypeMetadata, {
  IMetadata,
  IMetadataProperties,
  IMultilangLabel,
} from './CTypeMetadata'
import IClaim, { IClaimContents, CompressedClaim } from './Claim'
import ICredential from './Credential'
import {
  Permission,
  IDelegationBaseNode,
  IDelegationRootNode,
  IDelegationNode,
} from './Delegation'
import IPublicAttesterIdentity from './PublicAttesterIdentity'
import IPublicIdentity from './PublicIdentity'
import {
  ICostBreakdown,
  IQuote,
  IQuoteAttesterSigned,
  IQuoteAgreement,
  CompressedCostBreakdown,
  CompressedQuote,
  CompressedQuoteAttesterSigned,
  CompressedQuoteAgreed,
} from './Quote'
import IRequestForAttestation, {
  Hash,
  NonceHash,
  CompressedRequestForAttestation,
} from './RequestForAttestation'
import ITerms from './Terms'

export * from './AttestedClaim'
export { default as IAttestation } from './Attestation'
export { ICTypeSchema }

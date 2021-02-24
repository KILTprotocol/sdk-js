/**
 * @packageDocumentation
 * @ignore
 */
import Attestation, { AttestationUtils } from './attestation'
import AttestedClaim, { AttestedClaimUtils } from './attestedclaim'
import { Balance, BalanceUtils } from './balance'
import Blockchain, { IBlockchainApi, BlockchainUtils } from './blockchain'
import * as BlockchainApiConnection from './blockchainApiConnection'
import Claim, { ClaimUtils } from './claim'
import { CType, CTypeMetadata, CTypeSchema, CTypeUtils } from './ctype'
import {
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
  DelegationNodeUtils,
} from './delegation'
import Did, {
  IDid,
  IDidDocument,
  IDidDocumentPublicKey,
  IDidDocumentSigned,
} from './did'
import { Identity, IURLResolver, PublicIdentity } from './identity'
import Quote, { QuoteSchema, QuoteUtils } from './quote'
import RequestForAttestation, {
  RequestForAttestationUtils,
} from './requestforattestation'

export { connect, disconnect, config, init } from './kilt'
export { SubmittableResult } from '@polkadot/api'
export { SubmittableExtrinsic } from '@polkadot/api/promise/types'
export * from './errorhandling'

export { SDKErrors } from '@kiltprotocol/utils'

export {
  Blockchain,
  IBlockchainApi,
  BlockchainUtils,
  BlockchainApiConnection,
  Balance,
  BalanceUtils,
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
  DelegationNodeUtils,
  DelegationRootNode,
  Did,
  IDid,
  IDidDocument,
  IDidDocumentPublicKey,
  IDidDocumentSigned,
  Quote,
  QuoteUtils,
  QuoteSchema,
}

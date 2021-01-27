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
import Crypto from './crypto'
import { CType, CTypeMetadata, CTypeSchema, CTypeUtils } from './ctype'
import {
  DelegationBaseNode,
  DelegationNode,
  DelegationRootNode,
} from './delegation'
import Did, { IDid, IDidDocument, IDidDocumentPublicKey } from './did'
import { Identity, IURLResolver, PublicIdentity } from './identity'
import { ConfigService } from './config'
import Message from './messaging'
import Quote, { QuoteSchema, QuoteUtils } from './quote'
import RequestForAttestation, {
  RequestForAttestationUtils,
} from './requestforattestation'

export { connect, disconnect, config } from './kilt'
export { SubmittableResult } from '@polkadot/api'
export { SubmittableExtrinsic } from '@polkadot/api/promise/types'
export * from './errorhandling'
export * from './messaging'

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
  IDidDocument,
  IDidDocumentPublicKey,
  Message,
  Quote,
  QuoteUtils,
  QuoteSchema,
  ConfigService,
}

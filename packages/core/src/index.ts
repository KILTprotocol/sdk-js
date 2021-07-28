/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import Attestation, { AttestationUtils } from './attestation'
import AttestedClaim, { AttestedClaimUtils } from './attestedclaim'
import { Balance, BalanceUtils } from './balance'
import Claim, { ClaimUtils } from './claim'
import { CType, CTypeMetadata, CTypeSchema, CTypeUtils } from './ctype'
import {
  DelegationNode,
  DelegationHierarchyDetails,
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

export { SDKErrors } from '@kiltprotocol/utils'

export {
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
  DelegationHierarchyDetails,
  DelegationNode,
  DelegationNodeUtils,
  Did,
  IDid,
  IDidDocument,
  IDidDocumentPublicKey,
  IDidDocumentSigned,
  Quote,
  QuoteUtils,
  QuoteSchema,
}

/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { hexToU8a } from '@polkadot/util'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'
import type {
  ICType,
  ICredential,
  DidUri,
  Caip2ChainId,
  IDelegationNode,
} from '@kiltprotocol/types'
import { JsonSchema } from '@kiltprotocol/utils'
import { CType } from '@kiltprotocol/core'
import {
  DEFAULT_CREDENTIAL_CONTEXTS,
  DEFAULT_CREDENTIAL_TYPES,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_CREDENTIAL_CONTEXT_URL,
  KILT_CREDENTIAL_IRI_PREFIX,
  KILT_CREDENTIAL_TYPE,
  KILT_REVOCATION_STATUS_V1_TYPE,
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_TYPE,
} from './constants.js'
import type {
  CredentialBase,
  JsonSchemaValidator2018,
  KiltAttesterDelegationV1,
  KiltAttesterLegitimationV1,
  KiltRevocationStatusV1,
  VerifiableCredential,
} from './types.js'
import { CredentialMalformedError } from './verificationUtils.js'
import * as KiltAttestationProofV1 from './KiltAttestationProofV1.js'
import { Caip2 } from './CAIP/index.js'

/**
 * Extracts the credential root hash from a KILT VC's id.
 *
 * @param credentialId The IRI that serves as the credential id on KILT VCs.
 * @returns The credential root hash as a Uint8Array.
 */
export function credentialIdToRootHash(
  credentialId: VerifiableCredential['id']
): Uint8Array {
  const base58String = credentialId.startsWith(KILT_CREDENTIAL_IRI_PREFIX)
    ? credentialId.substring(KILT_CREDENTIAL_IRI_PREFIX.length)
    : credentialId
  try {
    return base58Decode(base58String, false)
  } catch (cause) {
    throw new Error(
      'Credential id is not a valid identifier (could not extract base58 encoded string)',
      { cause }
    )
  }
}

/**
 * Transforms the credential root hash to an IRI that functions as the VC's id.
 *
 * @param rootHash Credential root hash as a Uint8Array.
 * @returns An IRI composed by prefixing the root hash with the [[KILT_CREDENTIAL_IRI_PREFIX]].
 */
export function credentialIdFromRootHash(
  rootHash: Uint8Array
): VerifiableCredential['id'] {
  return `${KILT_CREDENTIAL_IRI_PREFIX}${base58Encode(rootHash, false)}`
}

interface CredentialInput {
  subject: DidUri
  claims: ICredential['claim']['contents']
  cType: ICType | Pick<ICType, '$id'>
  issuer: DidUri
  timestamp: number
  chainGenesisHash: Uint8Array
  claimHash?: ICredential['rootHash']
  legitimations?: Array<VerifiableCredential | Pick<VerifiableCredential, 'id'>>
  delegationId?: IDelegationNode['id']
}
interface CredentialInputWithRootHash extends CredentialInput {
  claimHash: ICredential['rootHash']
}

export function fromInput(
  input: CredentialInputWithRootHash
): Omit<VerifiableCredential, 'proof'>
/**
 * @param input
 * @param input.claimHash
 * @param input.subject
 * @param input.claims
 * @param input.cType
 * @param input.issuer
 * @param input.timestamp
 * @param input.chainGenesisHash
 * @param input.legitimations
 * @param input.delegationId
 */
export function fromInput({
  claimHash,
  subject,
  claims,
  cType,
  issuer,
  timestamp,
  chainGenesisHash,
  legitimations,
  delegationId,
}: CredentialInput): Omit<VerifiableCredential, 'proof' | 'id'> {
  // write root hash to id
  const id = credentialIdFromRootHash(hexToU8a(claimHash))

  // transform & annotate claim to be json-ld and VC conformant
  const credentialSubject = {
    '@context': { '@vocab': cType.$id },
    id: subject,
  }

  for (const key in claims) {
    credentialSubject[`#${key}`] = claims[key]
  }

  const credentialSchema: JsonSchemaValidator2018 = {
    id: cType.$id,
    type: JSON_SCHEMA_TYPE,
  }
  if ('properties' in cType) {
    credentialSchema.name = cType.title
    credentialSchema.schema = cType
  }

  const chainId: Caip2ChainId = Caip2.chainIdFromGenesis(chainGenesisHash)
  const credentialStatus: KiltRevocationStatusV1 = {
    id: chainId,
    type: KILT_REVOCATION_STATUS_V1_TYPE,
  }

  const federatedTrustModel: VerifiableCredential['federatedTrustModel'] = []
  legitimations?.forEach((legitimation) => {
    const entry: KiltAttesterLegitimationV1 = {
      id: legitimation.id,
      type: KILT_ATTESTER_LEGITIMATION_V1_TYPE,
    }
    if ('credentialSubject' in legitimation) {
      entry.verifiableCredential = legitimation
    }
    federatedTrustModel.push(entry)
  })
  if (delegationId) {
    const delegation: KiltAttesterDelegationV1 = {
      id: `${chainId}/kilt:delegation/${base58Encode(hexToU8a(delegationId))}`,
      type: KILT_ATTESTER_DELEGATION_V1_TYPE,
    }
    federatedTrustModel.push(delegation)
  }

  const issuanceDate = new Date(timestamp).toISOString()

  return {
    '@context': DEFAULT_CREDENTIAL_CONTEXTS,
    type: DEFAULT_CREDENTIAL_TYPES,
    ...(id && { id }),
    nonTransferable: true,
    credentialSubject,
    credentialSchema,
    issuer,
    issuanceDate,
    credentialStatus,
    ...(federatedTrustModel.length > 0 && { federatedTrustModel }),
  }
}

export const credentialSchema: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    '@context': {
      type: 'array',
      const: DEFAULT_CREDENTIAL_CONTEXTS,
    },
    type: {
      type: 'array',
      uniqueItems: true,
      minItems: 2,
      maxItems: 2,
      oneOf: [
        { contains: DEFAULT_CREDENTIAL_TYPES },
        {
          contains: [
            `${W3C_CREDENTIAL_CONTEXT_URL}#${W3C_CREDENTIAL_TYPE}`,
            `${KILT_CREDENTIAL_CONTEXT_URL}#${KILT_CREDENTIAL_TYPE}`,
          ],
        },
      ],
    },
    id: {
      type: 'string',
      format: 'uri',
    },
    nonTransferable: {
      type: 'boolean',
    },
    credentialSubject: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uri',
        },
      },
      required: ['id'],
    },
    issuer: {
      type: 'string',
      format: 'uri',
    },
    issuanceDate: {
      type: 'string',
      // not sure if there is difference between format: 'date-time' and the XSD date format
    },
    credentialStatus: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uri',
        },
        type: {
          // public credentials may have a different revocation check
          type: 'string',
        },
      },
      required: ['id', 'type'],
    },
    federatedTrustModel: {
      type: 'array',
      minLength: 1,
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uri',
          },
          type: {
            type: 'string',
          },
        },
      },
    },
  },
  additionalProperties: false,
  required: [
    '@context',
    'type',
    'id',
    'credentialSubject',
    'issuer',
    'issuanceDate',
    'credentialStatus',
  ],
}

const schemaValidator = new JsonSchema.Validator(credentialSchema)

/**
 * @param credential
 */
export function validateStructure(credential: CredentialBase): void {
  const { errors, valid } = schemaValidator.validate(credential)
  if (!valid)
    throw new CredentialMalformedError(
      `Object not matching ${KILT_CREDENTIAL_TYPE} data model`,
      {
        cause: errors,
      }
    )
}

/**
 * Transforms an [[ICredential]] object to conform to the KiltCredentialV1 data model.
 *
 * @param input
 * @param issuer
 * @param timestamp
 * @param chainGenesisHash
 * @param blockHash
 * @param ctype
 */
export function fromICredential(
  input: ICredential,
  issuer: DidUri,
  timestamp: number,
  chainGenesisHash: Uint8Array,
  blockHash: Uint8Array,
  ctype?: ICType
): VerifiableCredential {
  const {
    legitimations: legitimationsInput,
    delegationId,
    rootHash,
    claim,
  } = input
  const cType = ctype ?? { $id: CType.hashToId(claim.cTypeHash) }

  const legitimations = legitimationsInput.map(({ rootHash }) => ({
    id: credentialIdFromRootHash(hexToU8a(rootHash)),
  }))

  const vc = fromInput({
    claimHash: rootHash,
    subject: claim.owner,
    claims: claim.contents,
    chainGenesisHash,
    cType,
    issuer,
    timestamp,
    legitimations,
    ...(delegationId && { delegationId }),
  })

  const proof = KiltAttestationProofV1.fromICredential(input, blockHash)
  return { ...vc, proof }
}

/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { hexToU8a } from '@polkadot/util'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'

import { JsonSchema } from '@kiltprotocol/utils'
import { CType } from '@kiltprotocol/core'
import type {
  ICType,
  ICredential,
  DidUri,
  IDelegationNode,
} from '@kiltprotocol/types'

import { CredentialMalformedError } from './errors.js'
import { fromGenesisAndRootHash } from './KiltRevocationStatusV1.js'
import {
  DEFAULT_CREDENTIAL_CONTEXTS,
  DEFAULT_CREDENTIAL_TYPES,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
  KILT_CREDENTIAL_TYPE,
  spiritnetGenesisHash,
} from './constants.js'
import type {
  JsonSchemaValidator2018,
  KiltAttesterDelegationV1,
  KiltAttesterLegitimationV1,
  VerifiableCredential,
} from './types.js'

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
    throw new CredentialMalformedError(
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
  cType: ICType | ICType['$id']
  issuer: DidUri
  timestamp: number
  chainGenesisHash?: Uint8Array
  claimHash?: ICredential['rootHash']
  legitimations?: Array<VerifiableCredential | VerifiableCredential['id']>
  delegationId?: IDelegationNode['id']
}
interface CredentialInputWithRootHash extends CredentialInput {
  claimHash: ICredential['rootHash']
}

export function fromInput(
  input: CredentialInputWithRootHash
): Omit<VerifiableCredential, 'proof'>
/**
 * Produces a KiltCredentialV1 from input data.
 *
 * @param input Container for input data.
 * @param input.subject Did of the credential subject (claimer).
 * @param input.claims A record of claims about the subject.
 * @param input.cType The CType (or alternatively its id) to which the claims conform.
 * @param input.issuer The issuer of the credential.
 * @param input.timestamp Timestamp of a block at which the credential can be verified, in milliseconds since January 1, 1970, UTC (UNIX epoch).
 * @param input.chainGenesisHash Optional: Genesis hash of the chain against which this credential is verifiable. Defaults to the spiritnet genesis hash.
 * @param input.claimHash Optional: digest of the credential contents needed to produce a credential id.
 * @param input.legitimations Optional: array of credentials (or credential ids) which function as legitimations to this credential.
 * @param input.delegationId Optional: the id of a delegation node which was used in attesting this credential.
 * @returns A VerfiableCredential (without proof) conforming to the KiltCredentialV1 data model. The `id` is omitted if no `claimHash` was specified.
 */
export function fromInput({
  claimHash,
  subject,
  claims,
  cType,
  issuer,
  timestamp,
  chainGenesisHash = spiritnetGenesisHash,
  legitimations,
  delegationId,
}: CredentialInput): Omit<
  VerifiableCredential,
  'proof' | 'id' | 'credentialStatus'
> {
  // write root hash to id
  const id = credentialIdFromRootHash(hexToU8a(claimHash))

  const cTypeId = typeof cType === 'object' ? cType.$id : cType
  // transform & annotate claim to be json-ld and VC conformant
  const credentialSubject = {
    '@context': { '@vocab': `${cTypeId}#` },
    id: subject,
  }

  Object.entries(claims).forEach(([key, claim]) => {
    if (key.startsWith('@') || key === 'id' || key === 'type') {
      credentialSubject[`${cTypeId}#${key}`] = claim
    } else {
      credentialSubject[key] = claim
    }
  })

  const credentialSchema: JsonSchemaValidator2018 = {
    id: cTypeId,
    type: JSON_SCHEMA_TYPE,
  }
  if (typeof cType === 'object') {
    credentialSchema.name = cType.title
    credentialSchema.schema = cType
  }

  const federatedTrustModel: VerifiableCredential['federatedTrustModel'] = []
  legitimations?.forEach((legitimation) => {
    const type = KILT_ATTESTER_LEGITIMATION_V1_TYPE
    const entry: KiltAttesterLegitimationV1 =
      typeof legitimation === 'object'
        ? {
            id: legitimation.id,
            type,
            verifiableCredential: legitimation,
          }
        : {
            id: legitimation,
            type,
          }
    federatedTrustModel.push(entry)
  })
  if (delegationId) {
    const delegation: KiltAttesterDelegationV1 = {
      id: `kilt:delegation/${base58Encode(hexToU8a(delegationId))}`,
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
    ...(claimHash && {
      credentialStatus: fromGenesisAndRootHash(chainGenesisHash, claimHash),
    }),
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
      items: { enum: DEFAULT_CREDENTIAL_TYPES },
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
      format: 'date-time',
    },
    credentialStatus: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uri',
        },
        type: {
          // public credentials may have a different revocation check, so we don't force the type here
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
    credentialSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uri',
        },
        type: {
          type: 'string',
          const: JSON_SCHEMA_TYPE,
        },
        schema: { $ref: CType.Schemas.CTypeModel.$id },
      },
      required: ['id', 'type'],
    },
    proof: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
      },
      required: ['type'],
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
    'credentialSchema',
  ],
}

// draft version '7' should align with $schema property of the schema above
const schemaValidator = new JsonSchema.Validator(credentialSchema, '7')
schemaValidator.addSchema(CType.Schemas.CTypeModel)

/**
 * Validates an object against the KiltCredentialV1 data model.
 * Throws if object violates the [[credentialSchema]].
 *
 * @param credential Credential or object to be validated.
 */
export function validateStructure(credential: VerifiableCredential): void {
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
 * @param input An [[ICredential]] object.
 * @param options Additional required and optional parameters for producing a VC from an [[ICredential]].
 * @param options.issuer The issuer of the attestation to this credential (attester).
 * @param options.timestamp Timestamp of the block referenced by blockHash in milliseconds since January 1, 1970, UTC (UNIX epoch).
 * @param options.cType Optional: The CType object referenced by the [[ICredential]].
 * @param options.chainGenesisHash Optional: Genesis hash of the chain against which this credential is verifiable. Defaults to the spiritnet genesis hash.
 * @returns A KiltCredentialV1 with embedded KiltAttestationProofV1 proof.
 */
export function fromICredential(
  input: ICredential,
  {
    issuer,
    timestamp,
    cType: ctype,
    chainGenesisHash = spiritnetGenesisHash,
  }: Pick<CredentialInput, 'chainGenesisHash' | 'timestamp' | 'issuer'> &
    Partial<Pick<CredentialInput, 'cType'>>
): VerifiableCredential {
  const {
    legitimations: legitimationsInput,
    delegationId,
    rootHash: claimHash,
    claim,
  } = input
  const { cTypeHash, owner: subject, contents: claims } = claim
  const cType = ctype ?? CType.hashToId(cTypeHash)

  const legitimations = legitimationsInput.map(({ rootHash: legHash }) =>
    credentialIdFromRootHash(hexToU8a(legHash))
  )

  const vc = fromInput({
    claimHash,
    subject,
    claims,
    chainGenesisHash,
    cType,
    issuer,
    timestamp,
    legitimations,
    ...(delegationId && { delegationId }),
  })

  return vc
}

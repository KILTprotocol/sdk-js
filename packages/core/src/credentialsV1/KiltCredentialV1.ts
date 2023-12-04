/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { hexToU8a } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'

import { JsonSchema, SDKErrors } from '@kiltprotocol/utils'
import type {
  ICType,
  ICredential,
  Did,
  IDelegationNode,
} from '@kiltprotocol/types'

import * as CType from '../ctype/index.js'
import { fromGenesisAndRootHash } from './KiltRevocationStatusV1.js'
import { W3C_CREDENTIAL_CONTEXT_URL, W3C_CREDENTIAL_TYPE } from './constants.js'
import type {
  KiltAttesterDelegationV1,
  KiltAttesterLegitimationV1,
  KiltCredentialV1,
} from './types.js'
import {
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  credentialIdFromRootHash,
  jsonLdExpandCredentialSubject,
  spiritnetGenesisHash,
} from './common.js'
import { CTypeLoader, newCachingCTypeLoader } from '../ctype/CTypeLoader.js'

export {
  credentialIdFromRootHash as idFromRootHash,
  credentialIdToRootHash as idToRootHash,
  getDelegationNodeIdForCredential as getDelegationId,
} from './common.js'

/**
 * Credential context URL required for Kilt credentials.
 */
export const CONTEXT_URL = 'https://www.kilt.io/contexts/credentials'
/**
 * Ordered set of credential contexts required on every Kilt VC.
 */
export const DEFAULT_CREDENTIAL_CONTEXTS: [
  typeof W3C_CREDENTIAL_CONTEXT_URL,
  typeof CONTEXT_URL
] = [W3C_CREDENTIAL_CONTEXT_URL, CONTEXT_URL]
/**
 * Credential type required for Kilt credentials.
 */
export const CREDENTIAL_TYPE = 'KiltCredentialV1'
/**
 * Set of credential types required on every Kilt VC.
 */
export const DEFAULT_CREDENTIAL_TYPES: Array<
  typeof W3C_CREDENTIAL_TYPE | typeof CREDENTIAL_TYPE
> = [W3C_CREDENTIAL_TYPE, CREDENTIAL_TYPE]

export const CREDENTIAL_SCHEMA_TYPE = 'JsonSchema2023'

export {
  KILT_ATTESTER_DELEGATION_V1_TYPE as DELEGATION_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE as LEGITIMATION_TYPE,
}

export const credentialSchema: JsonSchema.Schema = {
  $id: 'ipfs://QmRpbcBsAPLCKUZSNncPiMxtVfM33UBmudaCMQV9K3FD5z',
  $schema: 'http://json-schema.org/draft-07/schema#',
  name: 'KiltCredentialV1',
  description: 'Verifiable Credential of KiltCredentialV1 type',
  type: 'object',
  properties: {
    '@context': {
      type: 'array',
      const: DEFAULT_CREDENTIAL_CONTEXTS,
    },
    type: {
      type: 'array',
      uniqueItems: true,
      minItems: 3,
      maxItems: 3,
      allOf: [
        { contains: { const: W3C_CREDENTIAL_TYPE } },
        { contains: { const: CREDENTIAL_TYPE } },
        { contains: { type: 'string', pattern: '^kilt:ctype:0x[0-9a-f]+$' } },
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
          const: CREDENTIAL_SCHEMA_TYPE,
        },
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
// we define an id when adding the CTypeModel because more than one anonymous schema is not allowed
schemaValidator.addSchema(CType.Schemas.CTypeModel, 'kilt.schemas/CTypeModel')

/**
 * Validates an object against the KiltCredentialV1 data model.
 * Throws if object violates the {@link credentialSchema}.
 *
 * @param credential Credential or object to be validated.
 */
export function validateStructure(
  credential: Omit<KiltCredentialV1, 'proof'>
): void {
  if (
    credential?.credentialSchema?.type !== CREDENTIAL_SCHEMA_TYPE ||
    credential?.credentialSchema?.id !== credentialSchema.$id
  ) {
    throw new Error(
      `A ${CREDENTIAL_TYPE} type credential must have a credentialSchema of type ${CREDENTIAL_SCHEMA_TYPE} and id ${credentialSchema.$id}`
    )
  }
  const { errors, valid } = schemaValidator.validate(credential)
  if (!valid)
    throw new SDKErrors.CredentialMalformedError(
      `Object not matching ${CREDENTIAL_TYPE} data model`,
      {
        cause: errors,
      }
    )
}

interface CredentialInput {
  subject: Did
  claims: ICredential['claim']['contents']
  cType: ICType['$id']
  issuer: Did
  timestamp?: number
  chainGenesisHash?: Uint8Array
  claimHash?: ICredential['rootHash']
  legitimations?: Array<KiltCredentialV1 | KiltCredentialV1['id']>
  delegationId?: IDelegationNode['id']
}
interface CredentialInputWithRootHash extends CredentialInput {
  claimHash: ICredential['rootHash']
}

export function fromInput(
  input: CredentialInputWithRootHash
): Omit<KiltCredentialV1, 'proof'>
export function fromInput(
  input: CredentialInput
): Omit<KiltCredentialV1, 'proof' | 'id' | 'credentialStatus'>
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
  subject,
  claims,
  cType,
  issuer,
  timestamp = Date.now(),
  chainGenesisHash = spiritnetGenesisHash,
  claimHash,
  legitimations,
  delegationId,
}: CredentialInput): Omit<
  KiltCredentialV1,
  'proof' | 'id' | 'credentialStatus'
> {
  // transform & annotate claim to be json-ld and VC conformant
  const credentialSubject = {
    '@context': { '@vocab': `${cType}#` },
    id: subject,
  }

  Object.entries(claims).forEach(([key, claim]) => {
    if (key.startsWith('@') || key === 'id' || key === 'type') {
      credentialSubject[`${cType}#${key}`] = claim
    } else {
      credentialSubject[key] = claim
    }
  })

  const federatedTrustModel: KiltCredentialV1['federatedTrustModel'] = []
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
    type: [...DEFAULT_CREDENTIAL_TYPES, cType],
    nonTransferable: true,
    credentialSubject,
    credentialSchema: {
      id: credentialSchema.$id as string,
      type: CREDENTIAL_SCHEMA_TYPE,
    },
    ...(claimHash && {
      credentialStatus: fromGenesisAndRootHash(chainGenesisHash, claimHash),
      id: credentialIdFromRootHash(claimHash),
    }),
    issuer,
    issuanceDate,
    ...(federatedTrustModel.length > 0 && { federatedTrustModel }),
  }
}

const cachingCTypeLoader = newCachingCTypeLoader()

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition.
 *
 * @param credential A {@link KiltCredentialV1} type verifiable credential.
 * @param credential.credentialSubject The credentialSubject to be validated.
 * @param credential.type The credential's types.
 * @param options Options map.
 * @param options.cTypes One or more CType definitions to be used for validation. If `loadCTypes` is set to `false`, validation will fail if the definition of the credential's CType is not given.
 * @param options.loadCTypes A function to load CType definitions that are not in `cTypes`. Defaults to using the {@link CachingCTypeLoader}. If set to `false` or `undefined`, no additional CTypes will be loaded.
 */
export async function validateSubject(
  {
    credentialSubject,
    type,
  }: Pick<KiltCredentialV1, 'credentialSubject' | 'type'>,
  {
    cTypes = [],
    loadCTypes = cachingCTypeLoader,
  }: { cTypes?: ICType[]; loadCTypes?: false | CTypeLoader } = {}
): Promise<void> {
  // get CType id referenced in credential
  const credentialsCTypeId = type.find((str) =>
    str.startsWith('kilt:ctype:')
  ) as ICType['$id']
  if (!credentialsCTypeId) {
    throw new Error('credential type does not contain a valid CType id')
  }
  // check that we have access to the right schema
  let cType = cTypes?.find(({ $id }) => $id === credentialsCTypeId)
  if (!cType) {
    if (typeof loadCTypes !== 'function') {
      throw new Error(
        `The definition for this credential's CType ${credentialsCTypeId} has not been passed to the validator and CType loading has been disabled`
      )
    }
    cType = await loadCTypes(credentialsCTypeId)
    if (cType.$id !== credentialsCTypeId) {
      throw new Error('failed to load correct CType')
    }
  }

  // normalize credential subject to form expected by CType schema
  const expandedClaims: Record<string, unknown> =
    jsonLdExpandCredentialSubject(credentialSubject)
  delete expandedClaims['@id']

  const vocab = `${cType.$id}#`
  const claims = Object.entries(expandedClaims).reduce((obj, [key, value]) => {
    if (!key.startsWith(vocab)) {
      throw new Error(
        `The credential contains claims which do not follow the expected CType: ${key}`
      )
    }
    return {
      ...obj,
      [key.substring(vocab.length)]: value,
    }
  }, {})
  // validates against CType (also validates CType schema itself)
  CType.verifyClaimAgainstSchema(claims, cType)
}

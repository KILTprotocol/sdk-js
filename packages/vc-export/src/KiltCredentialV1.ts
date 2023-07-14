/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { hexToU8a } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'

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
  KILT_CREDENTIAL_TYPE,
  W3C_CREDENTIAL_TYPE,
  spiritnetGenesisHash,
} from './constants.js'
import type {
  KiltAttesterDelegationV1,
  KiltAttesterLegitimationV1,
  KiltCredentialV1,
} from './types.js'
import {
  credentialIdFromRootHash,
  jsonLdExpandCredentialSubject,
} from './common.js'

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
        { contains: { const: KILT_CREDENTIAL_TYPE } },
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
          const: JSON_SCHEMA_TYPE,
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
 * Throws if object violates the [[credentialSchema]].
 *
 * @param credential Credential or object to be validated.
 */
export function validateStructure(
  credential: Omit<KiltCredentialV1, 'proof'>
): void {
  if (
    credential?.credentialSchema?.type !== JSON_SCHEMA_TYPE ||
    credential?.credentialSchema?.id !== credentialSchema.$id
  ) {
    throw new Error(
      `A ${KILT_CREDENTIAL_TYPE} type credential must have a credentialSchema of type ${JSON_SCHEMA_TYPE} and id ${credentialSchema.$id}`
    )
  }
  const { errors, valid } = schemaValidator.validate(credential)
  if (!valid)
    throw new CredentialMalformedError(
      `Object not matching ${KILT_CREDENTIAL_TYPE} data model`,
      {
        cause: errors,
      }
    )
}

interface CredentialInput {
  subject: DidUri
  claims: ICredential['claim']['contents']
  cType: ICType | ICType['$id']
  issuer: DidUri
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
    type: [...DEFAULT_CREDENTIAL_TYPES, cTypeId],
    nonTransferable: true,
    credentialSubject,
    credentialSchema: {
      id: credentialSchema.$id as string,
      type: JSON_SCHEMA_TYPE,
    },
    ...(claimHash && {
      credentialStatus: fromGenesisAndRootHash(chainGenesisHash, claimHash),
      id: credentialIdFromRootHash(hexToU8a(claimHash)),
    }),
    issuer,
    issuanceDate,
    ...(federatedTrustModel.length > 0 && { federatedTrustModel }),
  }
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
): Omit<KiltCredentialV1, 'proof'> {
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

export type CTypeLoader = (id: ICType['$id']) => Promise<ICType>

const loadCType: CTypeLoader = async (id) => {
  return (await CType.fetchFromChain(id)).ctype
}

/**
 * A factory for a CType loader that caches a CType definition once it has been loaded.
 * Used in validating the credentialSubject of a [[KiltCredentialV1]] against the Claim Type referenced in its `type` field.
 *
 * @param initialCTypes An array of CTypes with which the cache is to be initialized.
 * @returns A function that takes a CType id and looks up a CType definition in an internal cache, and if not found, tries to fetch it from the KILT blochchain.
 */
export function newCachingCTypeLoader(
  initialCTypes: ICType[] = []
): CTypeLoader {
  const ctypes: Map<string, ICType> = new Map()

  initialCTypes.forEach((ctype) => {
    ctypes.set(ctype.$id, ctype)
  })

  async function getCType(id: ICType['$id']): Promise<ICType> {
    const ctype: ICType = ctypes.get(id) ?? (await loadCType(id))
    ctypes.set(ctype.$id, ctype)
    return ctype
  }
  return getCType
}

const cachingCTypeLoader = newCachingCTypeLoader()

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition.
 *
 * @param credential A [[KiltCredentialV1]] type verifiable credential.
 * @param credential.credentialSubject The credentialSubject to be validated.
 * @param credential.type The credential's types.
 * @param options Options map.
 * @param options.cTypes One or more CType definitions to be used for validation. If `loadCTypes` is set to `false`, validation will fail if the definition of the credential's CType is not given.
 * @param options.loadCTypes A function to load CType definitions that are not in `cTypes`. Defaults to using the [[CachingCTypeLoader]]. If set to `false` or `undefined`, no additional CTypes will be loaded.
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

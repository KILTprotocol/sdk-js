/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { JsonSchema } from '@kiltprotocol/utils'

export const CTypeModelV1: JsonSchema.Schema & { $id: string } = {
  // $id is not contained in schema when fetched from ipfs bc that is impossible with a content-addressed system
  $id: 'ipfs://bafybeiah66wbkhqbqn7idkostj2iqyan2tstc4tpqt65udlhimd7hcxjyq/',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CType Metaschema (V1)',
  description:
    'Describes a CType, which is a JSON schema for validating KILT claim types.',
  type: 'object',
  properties: {
    $id: { pattern: '^kilt:ctype:0x[0-9a-f]+$', type: 'string' },
    $schema: {
      type: 'string',
      // can't use a const referencing schema id for a content-addressed schema
    },
    title: { type: 'string' },
    type: { const: 'object', type: 'string' },
    properties: {
      patternProperties: {
        '^.+$': {
          oneOf: [
            { $ref: '#/definitions/string' },
            { $ref: '#/definitions/number' },
            { $ref: '#/definitions/boolean' },
            { $ref: '#/definitions/cTypeReference' },
            { $ref: '#/definitions/array' },
          ],
          type: 'object',
        },
      },
      type: 'object',
    },
    additionalProperties: { const: false, type: 'boolean' },
  },
  additionalProperties: false,
  required: [
    '$id',
    '$schema',
    'additionalProperties',
    'properties',
    'title',
    'type',
  ],
  definitions: {
    cTypeReference: {
      additionalProperties: false,
      properties: {
        $ref: {
          pattern: '^kilt:ctype:0x[0-9a-f]+(#/properties/.+)?$',
          format: 'uri',
          type: 'string',
        },
      },
      required: ['$ref'],
    },
    string: {
      additionalProperties: false,
      properties: {
        type: {
          const: 'string',
        },
        format: { enum: ['date', 'time', 'uri'] },
        enum: {
          type: 'array',
          items: { type: 'string' },
        },
        minLength: {
          type: 'number',
        },
        maxLength: {
          type: 'number',
        },
      },
      required: ['type'],
    },
    boolean: {
      additionalProperties: false,
      properties: {
        type: {
          const: 'boolean',
        },
      },
      required: ['type'],
    },
    number: {
      additionalProperties: false,
      properties: {
        type: {
          enum: ['integer', 'number'],
        },
        enum: {
          type: 'array',
          items: { type: 'number' },
        },
        minimum: {
          type: 'number',
        },
        maximum: {
          type: 'number',
        },
      },
      required: ['type'],
    },
    array: {
      additionalProperties: false,
      properties: {
        type: { const: 'array' },
        items: {
          oneOf: [
            { $ref: '#/definitions/string' },
            { $ref: '#/definitions/number' },
            { $ref: '#/definitions/boolean' },
            { $ref: '#/definitions/cTypeReference' },
          ],
        },
        minItems: {
          type: 'number',
        },
        maxItems: {
          type: 'number',
        },
      },
      required: ['type', 'items'],
    },
  },
}

export const CTypeModelDraft01: JsonSchema.Schema & { $id: string } = {
  $id: 'http://kilt-protocol.org/draft-01/ctype#',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CType Metaschema (draft-01)',
  description: `Describes a CType, which is a JSON schema for validating KILT claim types. This version has known issues, the use of schema ${CTypeModelV1.$id} is recommended instead.`,
  type: 'object',
  properties: {
    $id: {
      type: 'string',
      format: 'uri',
      pattern: '^kilt:ctype:0x[0-9a-f]+$',
    },
    $schema: {
      type: 'string',
      format: 'uri',
      const: 'http://kilt-protocol.org/draft-01/ctype#',
    },
    title: {
      type: 'string',
    },
    type: {
      type: 'string',
      const: 'object',
    },
    properties: {
      type: 'object',
      patternProperties: {
        '^.*$': {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['string', 'integer', 'number', 'boolean'],
            },
            $ref: {
              type: 'string',
              format: 'uri',
            },
            format: {
              type: 'string',
              enum: ['date', 'time', 'uri'],
            },
          },
          additionalProperties: false,
          oneOf: [
            {
              required: ['type'],
            },
            {
              required: ['$ref'],
            },
          ],
        },
      },
    },
  },
  additionalProperties: false,
  required: ['$id', 'title', '$schema', 'properties', 'type'],
}

/**
 * Schema describing any currently known CType; this means it either conforms to V1 or draft-01 of the CType schema.
 * Using this schema allows CType validation to be agnostic to which version is used.
 */
export const CTypeModel: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema',
  oneOf: [
    // Option A): conforms to draft-01 of the CType meta sschema, which defines that the CType's $schema property must be equal to the CType meta schema's $id.
    { $ref: CTypeModelDraft01.$id },
    // Option B): The CType's $schema property references V1 of the CType meta schema, in which case this meta schema must apply.
    // The structure is different because V1 does not define the exact value of the $schema property because its $id is derived from the hash of its contents.
    {
      allOf: [
        // verifies that both of two (sub-)schemas validate against CType object.
        {
          // subschema 1: $schema is equal to CType meta schema V1's $id.
          properties: {
            $schema: {
              type: 'string',
              const: CTypeModelV1.$id,
            },
          },
        },
        {
          // subschema 2: CType meta schema V1.
          $ref: CTypeModelV1.$id,
        },
      ],
    },
  ],
  // CType meta schemas are embedded here, so that the references ($ref) can be resolved without having to load them first.
  definitions: {
    [CTypeModelDraft01.$id]: CTypeModelDraft01,
    [CTypeModelV1.$id]: CTypeModelV1,
  },
}

export const MetadataModel: JsonSchema.Schema = {
  $id: 'http://kilt-protocol.org/draft-01/ctype-metadata',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    metadata: {
      type: 'object',
      properties: {
        title: {
          type: 'object',
          properties: {
            default: {
              type: 'string',
            },
          },
          patternProperties: {
            '^.*$': {
              type: 'string',
            },
          },
          required: ['default'],
        },
        description: {
          type: 'object',
          properties: {
            default: {
              type: 'string',
            },
          },
          patternProperties: {
            '^.*$': {
              type: 'string',
            },
          },
          required: ['default'],
        },
        properties: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                title: {
                  type: 'object',
                  properties: {
                    default: {
                      type: 'string',
                    },
                  },
                  patternProperties: {
                    '^.*$': {
                      type: 'string',
                    },
                  },
                  required: ['default'],
                },
                description: {
                  type: 'object',
                  properties: {
                    default: {
                      type: 'string',
                    },
                  },
                  patternProperties: {
                    '^.*$': {
                      type: 'string',
                    },
                  },
                  required: ['default'],
                },
              },
              required: ['title'],
              additionalProperties: false,
            },
          },
        },
      },
      required: ['title', 'properties'],
      additionalProperties: false,
    },
    cTypeId: { type: 'string', minLength: 1 },
  },
  required: ['metadata', 'cTypeId'],
  additionalProperties: false,
}

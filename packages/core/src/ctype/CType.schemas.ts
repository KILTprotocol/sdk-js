/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { JsonSchema } from '@kiltprotocol/utils'

export const CTypeModelV1: JsonSchema.Schema & { $id: string } = {
  // $id is not contained in schema when fetched from ipfs bc that is impossible with a content-addressed system
  $id: 'ipfs://bafybeibjbq3tmmy7wuihhhwvbladjsd3gx3kfjepxzkq6wylik6wc3whzy',
  $schema: 'http://json-schema.org/draft-07/schema#',
  additionalProperties: false,
  description:
    'Describes a CType, which is a json schema for validating KILT claim types.',
  properties: {
    $id: { pattern: '^kilt:ctype:0x[0-9a-f]+$', type: 'string' },
    $schema: {
      type: 'string',
      // can't use a const refercing schema id for a content-addressed schema
    },
    additionalProperties: { const: false, type: 'boolean' },
    properties: {
      patternProperties: {
        '^.*$': {
          oneOf: [
            {
              additionalProperties: false,
              properties: { $ref: { format: 'uri', type: 'string' } },
              required: ['$ref'],
            },
            {
              additionalProperties: false,
              properties: {
                format: { enum: ['date', 'time', 'uri'], type: 'string' },
                type: {
                  enum: ['boolean', 'integer', 'number', 'string'],
                  type: 'string',
                },
              },
              required: ['type'],
            },
          ],
          type: 'object',
        },
      },
      type: 'object',
    },
    title: { type: 'string' },
    type: { const: 'object', type: 'string' },
  },
  required: [
    '$id',
    '$schema',
    'additionalProperties',
    'properties',
    'title',
    'type',
  ],
  title: 'CType Metaschema (V1)',
  type: 'object',
}

export const CTypeModelDraft01: JsonSchema.Schema & { $id: string } = {
  $id: 'http://kilt-protocol.org/draft-01/ctype#',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CType Metaschema (draft-01)',
  description: `Describes a CType, which is a json schema for validating KILT claim types. This version has known issues, the use of schema ${CTypeModelV1.$id} is recommended instead.`,
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

export const CTypeModel: JsonSchema.Schema = {
  oneOf: [
    CTypeModelDraft01,
    {
      allOf: [
        {
          properties: {
            $schema: {
              type: 'string',
              const: CTypeModelV1.$id,
            },
          },
        },
        CTypeModelV1,
      ],
    },
  ],
}

export const MetadataModel = {
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
          properties: {},
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

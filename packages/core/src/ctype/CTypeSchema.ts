/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module CTypeSchema
 */
import { JsonSchema } from '@kiltprotocol/utils'

export const CTypeModel: JsonSchema.Schema = {
  $id: 'ipns://k51qzi5uqu5dkglos1mtdukd4axyhwav7e98bga8g2nptrkgcbj9506ruoadiz/v1/ctype.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
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
      enum: [
        'http://kilt-protocol.org/draft-01/ctype#',
        'ipns://k51qzi5uqu5dkglos1mtdukd4axyhwav7e98bga8g2nptrkgcbj9506ruoadiz/v1/ctype.json',
      ],
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

export const CTypeWrapperModel = {
  $id: 'ipns://k51qzi5uqu5dkglos1mtdukd4axyhwav7e98bga8g2nptrkgcbj9506ruoadiz/v1/ctype-wrapper.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    schema: {
      type: 'object',
      properties: CTypeModel.properties,
      required: CTypeModel.required,
    },
    owner: { type: ['string', 'null'] },
    hash: {
      type: 'string',
    },
  },
  additionalProperties: false,
  required: ['schema', 'hash'],
}

export const MetadataModel = {
  $id: 'ipns://k51qzi5uqu5dkglos1mtdukd4axyhwav7e98bga8g2nptrkgcbj9506ruoadiz/v1/ctype-metadata.json',
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
    ctypeHash: { type: 'string', minLength: 1 },
  },
  required: ['metadata', 'ctypeHash'],
  additionalProperties: false,
}

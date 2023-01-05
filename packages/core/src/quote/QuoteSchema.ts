/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { JsonSchema } from '@kiltprotocol/utils'

export const QuoteSchema: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'kilt:quote:v1',
  type: 'object',
  title: 'Quote',
  properties: {
    attesterDid: {
      type: 'string',
    },
    cTypeHash: {
      type: 'string',
    },
    cost: {
      type: 'object',
      required: ['net', 'gross', 'tax'],
      properties: {
        net: {
          type: 'number',
        },
        gross: {
          type: 'number',
        },
        tax: {
          type: 'object',
        },
      },
    },
    currency: {
      type: 'string',
    },
    termsAndConditions: {
      type: 'string',
    },
    timeframe: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: [
    'attesterDid',
    'cTypeHash',
    'cost',
    'currency',
    'termsAndConditions',
    'timeframe',
  ],
}

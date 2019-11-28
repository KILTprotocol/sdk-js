/**
 * @module CType
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
// TODO: Generate from actual CTypeModel
// TODO: The SDK is not really responsible for this, since it is editor specific
export const CTypeInputModel = {
  $id: 'http://kilt-protocol.org/draft-01/ctype-input#',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CTYPE',
  type: 'object',
  properties: {
    $id: {
      title: 'Identifier',
      type: 'string',
      format: 'uri-reference',
      minLength: 1,
    },
    $schema: {
      title: 'Schema',
      type: 'string',
      format: 'uri',
      enum: ['http://kilt-protocol.org/draft-01/ctype-input#'],
      default: 'http://kilt-protocol.org/draft-01/ctype-input#',
      readonly: true,
      className: 'hidden',
    },
    title: {
      title: 'Title',
      type: 'string',
      minLength: 1,
    },
    properties: {
      title: 'Data',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            title: 'Title',
            type: 'string',
            default: 'New Property',
            minLength: 1,
          },
          $id: {
            title: 'Identifier',
            type: 'string',
            format: 'uri-reference',
            minLength: 1,
          },
          type: {
            title: 'Type',
            type: 'string',
            enum: ['string', 'integer', 'number', 'boolean'],
            enumTitles: ['Text', 'Number', 'Decimal', 'Yes/No'],
          },
          format: {
            title: 'Format',
            type: 'string',
            enum: ['date', 'time', 'uri'],
          },
        },
        required: ['$id', 'title', 'type'],
      },
      collapsed: false,
    },
    type: {
      title: 'Object Type',
      type: 'string',
      default: 'object',
      readonly: true,
      className: 'hidden',
    },
  },
  required: ['$id', '$schema', 'title', 'properties', 'type'],
}

export const CTypeModel = {
  $id: 'http://kilt-protocol.org/draft-01/ctype#',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    $id: {
      type: 'string',
      minLength: 1,
    },
    $schema: {
      type: 'string',
      format: 'uri',
      default: 'http://kilt-protocol.org/draft-01/ctype#',
      enum: ['http://kilt-protocol.org/draft-01/ctype#'],
    },
    type: {
      type: 'string',
      enum: ['object'],
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
            format: {
              type: 'string',
              enum: ['date', 'time', 'uri'],
            },
          },
          required: ['type'],
        },
      },
    },
  },
  required: ['$id', '$schema', 'properties', 'type'],
}

export const CTypeWrapperModel = {
  $id: 'http://kilt-protocol.org/draft-01/ctype-wrapper#',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    schema: {
      type: 'object',
      properties: CTypeModel.properties,
    },
    hash: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['schema'],
}

export const CTypeWrapperMetadata = {
  metadata: {
    $id: 'http://kilt-protocol.org/draft-01/ctype-metadata',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: {
      type: ' string',
    },
    description: {
      type: 'string',
    },
    properties: {
      type: 'object',
      properties: {},
      patternProperties: {
        '^.*$': {
          type: 'object',
          properties: {},
        },
      },
    },
  },
  ctypeHash: { type: 'string', minLength: 1 },
  required: ['metadata', 'ctypeHash'],
}

export const WrapperMetadata = {
  metadata: {
    $id: 'http://kilt-protocol.org/draft-01/ctype-metadata',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: {
      type: ' string',
    },
    description: {
      type: 'string',
    },
    properties: {
      type: 'object',
      properties: {},
      patternProperties: {
        '^.*$': {
          type: 'object',
          properties: {},
        },
      },
    },
  },
}

export const offerSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:offer:OFFERHASH',
  type: 'object',
  title: 'Offer',
  properties: {
    CTypeHash: {
      type: 'string',
      title: 'The Ctypehash Schema',

      pattern: '^(.*)$',
    },
    price: {
      type: 'object',
      title: 'The Price Schema',
      required: ['netto', 'brutto', 'tax'],
      properties: {
        netto: {
          type: 'number',
          title: 'The Netto Schema',
        },
        brutto: {
          type: 'number',
          title: 'The Brutto Schema',
        },
        tax: {
          type: 'number',
          title: 'The Tax Schema',
        },
      },
    },
    currency: {
      type: 'string',
      title: 'The currency Schema',

      pattern: '^(.*)$',
    },
    TermsConditions: {
      type: 'string',
      title: 'The Terms&conditions Schema',

      pattern: '^(.*)$',
    },
    prerequisite: {
      type: 'array',
      title: 'The Prerequisite Schema',
      items: {
        type: 'string',
        title: 'The Items Schema',

        pattern: '^(.*)$',
      },
    },
    offerTimeFrame: {
      type: 'string',
      title: 'The Offertimeframe Schema',

      pattern: '^(.*)$',
    },
    workToBeDone: {
      type: 'string',
      title: 'The Worktobedone Schema',

      pattern: '^(.*)$',
    },
  },
  required: [
    'CTypeHash',
    'price',
    'currency',
    'TermsConditions',
    'prerequisite',
    'offerTimeFrame',
    'Worktobedone',
  ],
}

export const offerExample = {
  CTypeHash: '0xa3890sd9f08sg8df9s..',
  price: {
    netto: 233,
    brutto: 23.3,
    tax: 23.3,
  },
  currency: 'Euro',
  TermsConditions: 'Lots of these',
  prerequisite: ['claim1Hash', 'claim2Hash'],
  offerTimeFrame: '3 days',
  Worktobedone: '3 days',
}

// {
//   $schema: 'http://json-schema.org/draft-07/schema#',
//   $id: 'http://example.com/root.json',
//   type: 'object',
//   title: 'The Root Schema',
//   required: [
//     'CTypeHash',
//     'price',
//     'currency',
//     'Terms&Conditions',
//     'prerequisite',
//     'offerTimeFrame',
//     'Worktobedone',
//   ],
//   properties: {
//     CTypeHash: {
//       $id: '#/properties/CTypeHash',
//       type: 'string',
//       title: 'The Ctypehash Schema',
//       default: '',
//       examples: ['0xa3890sd9f08sg8df9s..'],
//       pattern: '^(.*)$',
//     },
//     price: {
//       $id: '#/properties/price',
//       type: 'object',
//       title: 'The Price Schema',
//       required: ['netto', 'brutto', 'tax'],
//       properties: {
//         netto: {
//           $id: '#/properties/price/properties/netto',
//           type: 'integer',
//           title: 'The Netto Schema',
//           default: 0,
//           examples: [5],
//         },
//         brutto: {
//           $id: '#/properties/price/properties/brutto',
//           type: 'integer',
//           title: 'The Brutto Schema',
//           default: 0,
//           examples: [10],
//         },
//         tax: {
//           $id: '#/properties/price/properties/tax',
//           type: 'number',
//           title: 'The Tax Schema',
//           default: 0.0,
//           examples: [23.3],
//         },
//       },
//     },
//     currency: {
//       $id: '#/properties/currency',
//       type: 'string',
//       title: 'The currency Schema',
//       default: '',
//       examples: ['Euro'],
//       pattern: '^(.*)$',
//     },
//     'Terms&Conditions': {
//       $id: '#/properties/Terms&Conditions',
//       type: 'string',
//       title: 'The Terms&conditions Schema',
//       default: '',
//       examples: ['Lots of these'],
//       pattern: '^(.*)$',
//     },
//     prerequisite: {
//       $id: '#/properties/prerequisite',
//       type: 'array',
//       title: 'The Prerequisite Schema',
//       items: {
//         $id: '#/properties/prerequisite/items',
//         type: 'string',
//         title: 'The Items Schema',
//         default: '',
//         examples: ['claim1Hash', 'claim2Hash'],
//         pattern: '^(.*)$',
//       },
//     },
//     offerTimeFrame: {
//       $id: '#/properties/offerTimeFrame',
//       type: 'string',
//       title: 'The Offertimeframe Schema',
//       default: '',
//       examples: ['3 days'],
//       pattern: '^(.*)$',
//     },
//     Worktobedone: {
//       $id: '#/properties/Worktobedone',
//       type: 'string',
//       title: 'The Worktobedone Schema',
//       default: '',
//       examples: ['3 days'],
//       pattern: '^(.*)$',
//     },
//   },
// }

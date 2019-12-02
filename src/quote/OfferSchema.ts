export const QuoteSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:offer:QUOTEHASH',
  type: 'object',
  title: 'Quote',
  properties: {
    attesterID: {
      type: 'string',
      title: 'The Attester ID Schema',
      pattern: '^(.*)$',
    },
    claimerAcceptance: {
      type: 'string',
      title: 'The Claimer Acceptance Schema',
      pattern: '^(.*)$',
    },
    cTypeHash: {
      type: 'string',
      title: 'The Ctypehash Schema',
      pattern: '^(.*)$',
    },
    cost: {
      type: 'object',
      title: 'The Price Schema',
      required: ['net', 'gross', 'tax'],
      properties: {
        net: {
          type: 'number',
          title: 'The Net Schema',
        },
        gross: {
          type: 'number',
          title: 'The Gross Schema',
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
    termsAndConditions: {
      type: 'string',
      title: 'The Terms&conditions Schema',
      pattern: '^(.*)$',
    },
    offerTimeframe: {
      type: 'string',
      title: 'The Offertimeframe Schema',
      pattern: '^(.*)$',
    },
    version: {
      type: 'string',
      title: 'The Version Schema',
      pattern: '^(.*)$',
    },
  },
  required: [
    'attesterID',
    'claimerAcceptance',
    'cTypeHash',
    'cost',
    'currency',
    'termsAndConditions',
    'offerTimeframe',
    'version',
  ],
}

export const submitTerms = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:offer:SUBMITTERMS',
  type: 'object',
  title: 'Offer',
  properties: {
    claim: {
      type: 'string',
      title: 'The claim Schema',
      pattern: '^(.*)$',
    },
    legitimations: {
      type: 'array',
      title: 'The legitimations Schema',
      items: {
        type: 'string',
        title: 'The Items Schema',
        pattern: '^(.*)$',
      },
    },
    delegationId: {
      type: 'string',
      title: 'The delegationId Schema',
      pattern: '^(.*)$',
    },
    quote: QuoteSchema.properties,
    prerequisiteClaims: {
      type: 'array',
      title: 'The prerequisiteClaims Schema',
      items: {
        type: 'string',
        title: 'The Items Schema',
        pattern: '^(.*)$',
      },
    },
  },
  required: ['claim', 'legitimations'],
}

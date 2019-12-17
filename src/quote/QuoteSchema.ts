const QuoteSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:quote:QUOTEHASH',
  type: 'object',
  title: 'Quote',
  properties: {
    attesterAddress: {
      type: 'string',
      title: 'The Attester ID Schema',
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
    quoteTimeframe: {
      type: 'string',
      format: 'date-time',
      title: 'The quotetimeframe Schema',
      pattern: '^(.*)$',
    },
    version: {
      type: 'string',
      title: 'The Version Schema',
      pattern: '^(.*)$',
    },
  },
  required: [
    'attesterAddress',
    'cTypeHash',
    'cost',
    'currency',
    'termsAndConditions',
    'quoteTimeframe',
    'version',
  ],
}

export default QuoteSchema

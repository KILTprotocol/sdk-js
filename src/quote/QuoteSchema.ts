const QuoteSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:quote:QUOTEHASH',
  type: 'object',
  title: 'Quote',
  version: '1.0.0',
  properties: {
    attesterAddress: {
      type: 'string',
      title: 'The Attester ID Schema',
    },
    cTypeHash: {
      type: 'string',
      title: 'The Ctypehash Schema',
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
    },
    specVersion: {
      type: 'string',
      title: 'The Version Schema',
    },
    quoteHash: {
      type: 'string',
      title: 'The quote Hash Schema',
    },
  },
  required: [
    'attesterAddress',
    'cTypeHash',
    'cost',
    'currency',
    'termsAndConditions',
    'quoteTimeframe',
    'specVersion',
  ],
}

export default QuoteSchema

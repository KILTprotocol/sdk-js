const QuoteSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:quote:QUOTEHASH',
  type: 'object',
  title: 'Quote',
  version: '1.0.0',
  properties: {
    attesterAddress: {
      type: 'string',
    },
    cTypeHash: {
      type: 'string',
    },
    cost: {
      type: 'object',
      title: 'The Price Schema',
      required: ['net', 'gross', 'tax'],
      properties: {
        net: {
          type: 'number',
        },
        gross: {
          type: 'number',
        },
        tax: {
          type: 'number',
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
    specVersion: {
      type: 'string',
    },
    quoteHash: {
      type: 'string',
    },
  },
  required: [
    'attesterAddress',
    'cTypeHash',
    'cost',
    'currency',
    'termsAndConditions',
    'timeframe',
    'specVersion',
  ],
}

export default QuoteSchema

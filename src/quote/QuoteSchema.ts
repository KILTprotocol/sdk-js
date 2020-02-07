const QuoteSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'KILT:quote:v1.0.0',
  type: 'object',
  title: 'Quote',
  version: 'v1.0.0',
  properties: {
    attesterAddress: {
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
    'attesterAddress',
    'cTypeHash',
    'cost',
    'currency',
    'termsAndConditions',
    'timeframe',
  ],
}

export default QuoteSchema

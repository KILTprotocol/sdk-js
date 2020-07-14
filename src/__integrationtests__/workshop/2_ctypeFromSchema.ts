import * as Kilt from '../../index'

/* 🚧 COPY_START for ctypeFromSchema_example (below this comment) 🚧 */
// const Kilt = require('@kiltprotocol/sdk-js') //❗️ UNCOMMENT-LINE in workshop ❗️

const ctype = Kilt.CType.fromSchema({
  $id: 'kilt:ctype:0x1',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'Drivers License',
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
  },
  type: 'object',
})
/* 🚧 COPY_END for ctypeFromSchema_example (below this comment) 🚧 */

export default ctype

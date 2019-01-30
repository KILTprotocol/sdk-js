import { u8aToHex } from '@polkadot/util'
import { keccakAsU8a } from '@polkadot/util-crypto'

const object = {
  claim: {
    name: 'Timo',
    age: 31,
  },
  legitimations: [
    {
      claim: {
        isCompany: true,
      },
      attestation: {
        attester: '0x12324214a',
        signature: '0x324234234',
      },
    },
  ],
}

const hash = hashBranch(object)
console.log(u8aToHex(hash))

function hashBranch(obj: any): Uint8Array {
  let result = new Uint8Array([])
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      let val = obj[key]
      let intermediate = new Uint8Array([])

      if (typeof val === 'object') {
        intermediate = hashBranch(val)
      } else {
        // const hashedKey = keccakAsU8a(key)
        if (typeof val !== 'string') {
          val = val.toString()
        }
        // const hashedVal = keccakAsU8a(val)
        // intermediate = new Uint8Array(hashedKey.length + hashedVal.length)
        // intermediate.set(hashedKey)
        // intermediate.set(hashedVal, hashedKey.length)
        intermediate = keccakAsU8a(`${key}:${val}`)
      }
      const old = result
      result = new Uint8Array(old.length + intermediate.length)
      result.set(old)
      result.set(intermediate, old.length)
      result = keccakAsU8a(result)
    }
  }
  return result
}

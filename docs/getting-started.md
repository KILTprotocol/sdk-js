# Getting Started with the KILT SDK

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol. The next examples give you a simple skeleton how to use the KILT SDK to create identities, CTYPEs and claims, and also how to issue an attestation with the use of our messaging framework.

## How to generate an Identity

To generate an Identity first you generate a [BIP39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and then use it to create the Identity:

```typescript
import Kilt, from '@kiltprotocol/sdk'

const mnemonic = Kilt.Identity.generateMnemonic()
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const claimer = Kilt.Identity.buildFromMnemonic(mnemonic)
// claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
```

At this point the generated Identity has no tokens. If you want to interact with the blockchain, you will have to get some. Contact mashnet.faucet@kilt.io and provide the address of the identity.

## How to build a Claim Type (CTYPE)

First we build a JSON Schema for the CTYPE:
```typescript
const ctypeSchema: ICType['schema'] = {
  $id: 'DriversLicense',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
  },
  type: 'object',
}
```

Next we generate the hash for the CTYPE:
```typescript
const ctypeHash = CTypeUtils.getHashForSchema(ctypeSchema)
```

Then we build metadata for the CTYPE schema:
```typescript
const ctypeMetadata: ICType['metadata'] = {
  title: {
    default: 'DriversLicense',
  },
  description: {
    default: '',
  },
  properties: {
    name: {
      title: {
        default: 'name',
      },
    },
    age: {
      title: {
        default: 'age',
      },
    },
  },
}
```

Put everything together and construct into a raw structure:
```typescript
const rawCtype: ICType = {
  schema: ctypeSchema,
  metadata: ctypeMetadata,
  hash: ctypeHash,
  owner: claimer.address,
}
```

Now we can build the CTYPE object from the raw structure:
```typescript
const ctype = new Kilt.CType(rawCtype)
```

Note that before you can store the CTYPE on the blockchain, you have to connect to it.
First, setup your local node and start it (LINK!!!), using the dev chain and then you can connect to it with:
```typescript
Kilt.connect('ws://localhost:9944')
```

To store the CTYPE on the blockchain, you have to call:
```typescript
ctype.store(claimer)
```

Be aware that this step costs tokens, so you have to have sufficient funds on your account of the identity. Also note, that the completely same CTYPE can only be stored once on the blockchain.

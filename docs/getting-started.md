# Getting Started with the KILT SDK

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol. The next examples give you a simple skeleton how to use the KILT SDK to create identities, CTYPEs and claims, and also how to issue an attestation with the use of our messaging framework.

## How to generate an Identity
```typescript
import Kilt, from '@kiltprotocol/sdk'

const mnemonic = Kilt.Identity.generateMnemonic()
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const claimer = Kilt.Identity.buildFromMnemonic(mnemonic)
// claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
```

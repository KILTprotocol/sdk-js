# Getting-started


## How to generate an Identity
```typescript
import Kilt, from '@kiltprotocol/sdk'

const mnemonic = Kilt.Identity.generateMnemonic() 
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const claimer = Kilt.Identity.buildFromMnemonic(mnemonic)
// claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
```

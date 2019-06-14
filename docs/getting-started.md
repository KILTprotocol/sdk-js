# Getting Started with the KILT SDK

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol. The next examples give you a simple skeleton on how to use the KILT SDK to create identities, CTYPEs and claims, and also how to issue an attestation with the use of our messaging framework.

## Prerequisities
- make a new directory and navigate into it
- install the SDK with `npm install @kiltprotocol/sdk-js`
- install typescript with `npm install typescript`
- make a new file. E.g. `getting-started.ts`
- execute file with `npx ts-node getting-started.ts`

## How to generate an Identity

To generate an Identity first you have to generate a [BIP39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and then use it to create the Identity:

```typescript
import Kilt from '@kiltprotocol/sdk-js'

const mnemonic = Kilt.Identity.generateMnemonic()
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const claimer = Kilt.Identity.buildFromMnemonic(mnemonic)
// claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
```

At this point the generated Identity has no tokens. If you want to interact with the blockchain, you will have to get some. Contact mashnet.faucet@kilt.io and provide the address of the identity.

## How to build a Claim Type (CTYPE)

First we build a JSON Schema for the CTYPE:
```typescript
import Kilt, {
   ICType,
   CTypeUtils,
} from '@kiltprotocol/sdk-js'

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

Combine everything into our Ctype object definition:
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
First, [setup your local node](https://github.com/KILTprotocol/prototype-chain) and start it, using the dev chain and then you can connect to it with:
```typescript
Kilt.connect('ws://localhost:9944')
```

To store the CTYPE on the blockchain, you have to call:
```typescript
ctype.store(claimer)
```

Be aware that this step costs tokens, so you have to have sufficient funds on your account of the identity. Also note, that the completely same CTYPE can only be stored once on the blockchain.

At the end of the process, the `CType` object should contain the following. This can be saved anywhere, for example on a CTYPE registry service:
```typescript
CType {
  schema:
   { '$id': 'DriversLicense',
     '$schema': 'http://kilt-protocol.org/draft-01/ctype#',
     properties: { name: [Object], age: [Object] },
     type: 'object' },
  metadata:
   { title: { default: 'DriversLicense' },
     description: { default: '' },
     properties: { name: [Object], age: [Object] } },
  owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz',
  hash:
   '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0' }
```


## How to build a Claim

To construct a claim we need to know the structure of the claim that is defined in a CTYPE. Based on the CTYPE, we need to build a basic claim object with the respective fields filled out:

```typescript
const rawClaim = {
  name: 'Alice',
  age: 29,
}
```

Now we can easily create the KILT compliant claim. We have to include the full CType object, the raw claim object and the address of the owner/creator of the claim in the contstructor:
```typescript
import Kilt from '@kiltprotocol/sdk-js'

const claim = new Kilt.Claim(ctype, rawClaim, claimer)
```

As a result we get the following KILT claim:
```typescript
Claim {
  cType:
   '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
  contents: { name: 'Alice', age: 29 },
  owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz' }
```


## How to request, create and send an Attestation

First, we need to build a request for an attestation, which has to include a claim and the address of the Claimer. (Note that this object allows much more functionality, however, we do not go into the details here):
```typescript
import Kilt from '@kiltprotocol/sdk-js'

const requestForAttestation = new Kilt.RequestForAttestation(claim, [], claimer)
```

The `requestForAttestation` object looks like this:
```typescript
RequestForAttestation {
  claim:
   Claim {
     cType:
      '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
     contents: { name: 'Alice', age: 29 },
     owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz' },
  ctypeHash:
   { nonce: '1f81c5b4-6765-461f-8748-cc6682ea0dcb',
     hash:
      '0xf209e07c39502db88dbdcbe409b5c13f70204afab7a3dd8fbeafa0e4f46cf694' },
  legitimations: [],
  delegationId: undefined,
  claimHashTree:
   { name:
      { nonce: '1b0cada9-7d0b-4ef5-b55f-2cd0b81da1fa',
        hash:
         '0x68e8292dd15f3965a84c5e7be317abbba9aef5be242decfd763f357b205a755a' },
     age:
      { nonce: 'f8b252e9-ebc5-4f1b-bda5-4b282311dfba',
        hash:
         '0xb135bf42e7d324b572a0da15a6d7c6302a086493f4c9eee661ca8b8266eda8fd' } },
  hash:
   '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
  claimerSignature:
   '0x3de3b6c245f43533a9f78730dc9f32664098adec5e31ae643f826b2439c00fa18720e1c40dcfde3a99eda74903e5be09303096286ef7659ba312a3b4a807550b' }
```


To send the request for an attestation to an Attester, first we need to create an Attester identity:
```typescript
import Kilt from '@kiltprotocol/sdk-js'

const mnemonicForAttester = Kilt.Identity.generateMnemonic()
const attester = Kilt.Identity.buildFromMnemonic(mnemonicForAttester)
```

If the Attester doesn't live on the same machine, we need to send her a message with the request.
KILT contains a simple messaging system and we describe it through the following example.

First, we create the request for an attestation message. This includes that the Claimer encrypts the message with the public key of the Attester:
```typescript
import Kilt, {
   IRequestAttestationForClaim,
   MessageBodyType
} from '@kiltprotocol/sdk-js'

const messageBody: IRequestAttestationForClaim = {
  content: requestForAttestation,
  type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
}
const message = new Kilt.Message(messageBody, claimer, attester)
```

The complete `message` looks as follows:
```typescript
Message {
  body:
   { content:
      RequestForAttestation {
        claim: [Claim],
        ctypeHash: [Object],
        legitimations: [],
        delegationId: undefined,
        claimHashTree: [Object],
        hash:
         '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
        claimerSignature:
         '0x3de3b6c245f43533a9f78730dc9f32664098adec5e31ae643f826b2439c00fa18720e1c40dcfde3a99eda74903e5be09303096286ef7659ba312a3b4a807550b' },
     type: 'request-attestation-for-claim' },
  createdAt: 1557504512238,
  receiverAddress: '5Et4BBKPgfBJSsAmMvHCVd6YH4eaGyo5RWd44W8RPdw14Bi1',
  senderAddress: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz',
  message:
   '0x7f7ffbc55a6f176710672a4e3c94d80db1e722de3235ee15132a2a779196f6d6e08175f22131da8691aec62ba622b8f321c0152152678e4a82560d8e7cbc1d80adf757d1b86c0c3a85a9b577efef6a3f81b5518a748df41cd7cdbf6c1659c0e32b4f0df9b322693e042f9667d9962d4edcb0d7694f145d91f7e0b04b2610e6363db45f65165b5e706c913822b80f965d77e64cd59bc5f226175d43c8ffbfa1a076f54a201627ac867448d757b6e7e14d42961bd67c01225559ecd888e337fff628c98155e400ec478e8e834a7b38a3a1d8551399fd775c1622e6206cce3c0adc5cf353a990db10a459b5c4e64523eb059e9594ba0329307f69493bc8492c72d2ed27bd145e88d608d322f08cba91b93f4685e289f22f6cdb20cb9f3a1830e1b9d30679fac8c0687513d359fd9bb4b3b662b0d4808041725f37cd4d3544ab9f443d0bcbdcdbba0247aefa2fb83eb6c492195e1427caabd7ab7c80d87f8a647feb818929ac6d0f524d5704dbd793c867ec40cc5940af3e3927e3c5b2051893684f68d0946677b24eeca6f4cb13c810dc1af9c7c053f51a732e30c20d5e672d74baea5f4f7dc72d08ffa0e8d24ca1d49e3791580c213355d9682363f4486fbab8130393aae485afcdd632c22db369c812040934a546d3137dc01d7966eda007aad8b1a6459824d3e621605dfa258524512183b74aad44fb634bbae3d49492324396b3b6fad4ec4d0d5575770835334ac7bfb50462e0836295e7d3287b3af3cee834f1da8c0fa41be6bb85a360896658f42ea9e26c927a43e1827af79132a7713f2da07b3231561e545b92f0e6cd4719c81c2354437fe4c8015ee5b07dafad89ec791f61309493131564e3c2fff7be050b8e3b9e7056ffd3326877ea1892ef98e4eef52bda5f8ca991b1e7203f7a4e636a4f5051164bb4bb384e9cfd0cbdf0e9d2170c102740b87de7f5946e6df85c30dd84e0ec5b24b0888edb4cf1e32cfe0028b7c4ceb3781b9e537ffe38ff3996e1336a1f4258a2d8e28e712b08cb33ef1fe4c09486062a74675c263e39c43dec5775b28bd64ad404253e3f1f07dbaffcb61ec28a6a22678881a1913c06d1206896f5ba010b5fe2f6b556230244aa4e649b546c287c354259025720c4ceb44da52ecaca4a1fea93dc2041d6ef23858f6b7a30856d166ac8113be2991ed573bdb2dabb35b34d1b95b3540de5b461f95f899b3c9a0d9ae111ca8eba8a4883406b03bf60f71c7b4b79af1ae306bdf4fc27e18a2314601a6ebe2eb0077fcde974cf039b191728c0fdf0',
  nonce: '0xcf91336fe836f9ab9d99c43025b06e411d57b636d1a17fd0',
  hash:
   '0x45a03837bf67318a0e8b97e057cf347cf6dcfc280cc89fbf601a23bd7fe1b3e2',
  signature:
   '0xefdfbbac968ec805c22bfe97219268d470cfb74e27ae13ef29c399a74ffae68d55a0a474b6c5ecea37e4716c0ec81dc83761ee99b13a8c984ea4c76101bab204' }
```


The message can be encrypted as follows:
```typescript
const encrypted = message.getEncryptedMessage()
```

The messaging system is transport agnostic. When the Attester receives the request message, she can check the validity of the message to make sure that nobody has tampered with it on the way:
```typescript
import Message from '@kiltprotocol/sdk-js'

Message.ensureHashAndSignature(encrypted, claimer)
```

and the Attester (and only she) can also decrypt it:
```typescript
const decrypted = Message.createFromEncryptedMessage(
  encrypted,
  claimer,
  attester
)
```

and make sure, that the sender is the owner of the identity:
```typescript
Message.ensureOwnerIsSender(decrypted)
```

At this point, the Attester has the original request for attestation object:
```typescript
if (decrypted.body.type === MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
   const extractedRequestForAttestation: IRequestForAttestation = decrypted.body.content
}
```


The Attester creates the attestation based on the IRequestForAttestation object she received:
```typescript
const attestation = new Kilt.Attestation(extractedRequestForAttestation, attester)
```

The complete `attestation` object looks as follows:
```typescript
Attestation {
  owner: '5Et4BBKPgfBJSsAmMvHCVd6YH4eaGyo5RWd44W8RPdw14Bi1',
  claimHash:
   '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
  cTypeHash:
   '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
  delegationId: undefined,
  revoked: false }
```


Now the Attester can store the attestation on the blockchain, which costs tokens:
```typescript
attestation.store(attester)
```

The request for attestation is fulfilled with the attestation, but it needs to be combined into the `AttestedClaim` object before sending it back to the Claimer:

```typescript
const attestedClaim = new Kilt.AttestedClaim(extractedRequestForAttestation, attestation)
```

The complete `attestedClaim` object looks as follows:
```typescript
AttestedClaim {
  request:
   RequestForAttestation {
     claim:
      Claim {
        cType:
         '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
        contents: [Object],
        owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz' },
     ctypeHash:
      { nonce: '1f81c5b4-6765-461f-8748-cc6682ea0dcb',
        hash:
         '0xf209e07c39502db88dbdcbe409b5c13f70204afab7a3dd8fbeafa0e4f46cf694' },
     legitimations: [],
     delegationId: undefined,
     claimHashTree: { name: [Object], age: [Object] },
     hash:
      '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
     claimerSignature:
      '0x3de3b6c245f43533a9f78730dc9f32664098adec5e31ae643f826b2439c00fa18720e1c40dcfde3a99eda74903e5be09303096286ef7659ba312a3b4a807550b' },
  attestation:
   Attestation {
     owner: '5Et4BBKPgfBJSsAmMvHCVd6YH4eaGyo5RWd44W8RPdw14Bi1',
     claimHash:
      '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
     cTypeHash:
      '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
     delegationId: undefined,
     revoked: false } }
```

The Attester has to send the `attestedClaim` object back to the Claimer in the following message:
```typescript
import ISubmitAttestationForClaim from '@kiltprotocol/sdk-js'

const messageBodyBack: ISubmitAttestationForClaim = {
  content: attestedClaim,
  type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
}
const messageBack = new Message(messageBodyBack, attester, claimer)
```

The complete `messageBack` message then looks as follows:
```typescript
AttestedClaim message Message {
  body:
   { content:
      AttestedClaim { request: [RequestForAttestation], attestation: [Attestation] },
     type: 'submit-attestation-for-claim' },
  createdAt: 1557504512277,
  receiverAddress: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz',
  senderAddress: '5Et4BBKPgfBJSsAmMvHCVd6YH4eaGyo5RWd44W8RPdw14Bi1',
  message:
   '0x1e1e754693ca512d054bfdaadad11fbb422ee70a1d425d339ec6362d3cd0f8b04c6aa0b4441c5149a1a19977c893a861fe824f63dbdd72a5b641965403154ea284a193e111d1c2447e4116ec1c760191cb9e12efe7fb1d70351ac6f3ae6f31142aa3170f002dda6f54fc046f6f5714345a013c0b75c948802dddc593ce7f65450b490fcb31c5849a937516b6acf86b6923f6c1efbdf38a2bac96c9549ee9b2ea4701b73cc1f35627852ae78f140313f2ad15c6d00597680f88244fa1ae751980aeae8be215fbc9d85484a669290e672fb4beb6954cb3d221f821fab3dc8050cb789df51d00a382d45a68df6d85f379f5e2652b26c89c933c2fe9011bf6c712e8e67b0e63c25893a8dd182283b33ec652b281d6889022c6741c8deb8dd7ce18068cfbeee202d2c56e6a8e968f33d063df147aa4358e450695fe45773075962b4656c2c42a3f4cbb12284e26d4209e0cb514f432754200a0714796ab3f0eec314c1bd5b5f11709eac14630cb15c6b1bd8c6c189daaf1e2fe94359745c2003e6541732ed8784e335680aef50fff489b24d10a9840bc86b862f5c7faa3516987be7dc1356dcab0861ab03b411848d8a46aab68b088f6dace121717ae9ede2f9f5f11831c664f40a8dde742866fdb0c6b54fce573b69bc7ab8cea1d5c96da8e735af030925499bf3d66ae4065118991938f92fbe1ef946ab74d159f53bd03865a758196f18223e2b266636092be33eb12814f08714837ee6081138c5a91d4d8cf0ba68a4ee74d38757b8f532f594b0c0de6fb7662305b307c26c0fa1d8f9815768491ce5bd9b6afeb5f303d4c0339cf88da9b92e3b5908289518505191095f42428b804ba106d25d8568482e7427b3a42f21652d6630fc0331ff66396805515eaaf2ca25a1d4bf0dc0f325bd5f367be30ef8b29ae22f07301d93586ee09b81dd418eb0063229f43ef28523d8eb03239bc4bcc45e30d0c5f8fa8073e65b96fd19a67a43d12e5920ee9a6ca647f14ed35eb671e0eec01c37d66f4e36cc265fe7e070083df3af2a67e06b9f5c0bd6cd1ce2839de665158d3a24da121a217b35e3b7cadc00c96fbca1bda5b2d0d8508767ccbc69da1933e1752fb237a6bbb2d136513dd0f6ac22b53440b44704ac8b374ead7203688c282fc0ee57c04ea903596162cf131147ae7d34a880b62a64d000e6b084a9388c2a2e17b30639e967f0d69fdade75dfe64c93cea149ffb559bf9fb6aacce09704d6673b3a83d2bf778a366bdb69ea2f7579db08bdd47fbb6bcdd6bdb334bc3d245597b2102722aceb5945663f3573b3f4d173112e7c5ecec88308f40fa8d7f81ff06edf8f30b5ceee50ad18cea637296b658961d73c4d70bb42ecb2c51d283d619d1098dec198e1541393e78110839a548c28402a7d7d5985b0093f774b7aa6860274aba638b509c0a1f54da0d5359930211075cd88515d02caa7690b89c10cfe2d41f2d9f42032760536b2695e51719e8e3c83e3ba9e407efe0159a7fe1bebdf5b00fa06a8c07353f403c0c5cda09c205600b43d2e43d4ef27991dffe2b77df3e086cf8e8d2742e7f8269dd6abc6815cba1a36824ebe52d878c6d0e1380a6ea3acdefc213c1ce34dac2f477f4d81d1224f1640559e6b1911aee83c4b3c4d55661215bffb9ceb67b536276',
  nonce: '0x97843ffe7cf1ebbc9fa238d636ab6ce6c2b7b42d547e7381',
  hash:
   '0x7f45866df6ebc6bb39e9f461f4880a8de84b3a631de41f75cfab36e5b68d135c',
  signature:
   '0xa52d2d36beed55a2762b1790233302faf82cff8b50b26e8764c5061a65a7fce04fc3f938bf0d186f255f58abbbaae1a343a04d521b13836b0f96d0d0dbeac70e' }
```


After receiving the message, the Claimer just needs to save it and can use it later for verification:
```typescript
if (messageBack.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
   const myAttestedClaim = messageBack.body.content
}
```

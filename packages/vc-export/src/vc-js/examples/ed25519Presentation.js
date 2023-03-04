const vc = require('@digitalbazaar/vc')
const { connect, disconnect } = require('@kiltprotocol/core')
const Did = require('@kiltprotocol/did')
const { KiltCredentialV1, vcjsSuites } = require('@kiltprotocol/vc-export')
const {
  Ed25519Signature2018,
  suiteContext: SuiteContext2018,
} = require('@digitalbazaar/ed25519-signature-2018')
const {
  Ed25519Signature2020,
  suiteContext,
} = require('@digitalbazaar/ed25519-signature-2020')
const { hexToU8a } = require('@polkadot/util')
const { default: Keyring } = require('@polkadot/keyring')
const jsonld = require('jsonld')
const { AuthenticationProofPurpose } = require('jsonld-signatures').purposes

const {
  suites: { KiltAttestationV1Suite },
  purposes: { KiltAttestationProofV1Purpose },
} = vcjsSuites

const ingos_cred = {
  claim: {
    cTypeHash:
      '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac',
    contents: {
      Email: 'ingo@kilt.io',
    },
    owner: 'did:kilt:4sJm5Zsvdi32hU88xbL3v6VQ877P4HLaWVYUXgcSyQR8URTu',
  },
  claimHashes: [
    '0x8113c20adf617adb9fe3a2c61cc2614bf02cd58e0e42cb31356e7f5c052e65de',
    '0xa19685266e47579ecd72c30b31a928eef0bd71b7d297511c8bef952f2a5822a1',
  ],
  claimNonceMap: {
    '0x02eaa62e144281c9f73355cdb5e1f4edf27adc4e0510c2e60dca793c794dba6a':
      'e8f78c9e-70b5-48ea-990f-97782bc62c84',
    '0x1767f2220a9b07e22b73c5b36fa90e6f14338b6198e7696daf464914942734ab':
      '1f454fcc-dc73-46d4-9478-db5e4c8dda3b',
  },
  legitimations: [],
  delegationId: null,
  rootHash:
    '0x4fb274ed275ae1c3a719428088ffde0bbc10e456eba8aedc9687178a4ce47c20',
  claimerSignature: {
    keyId:
      'did:kilt:4sJm5Zsvdi32hU88xbL3v6VQ877P4HLaWVYUXgcSyQR8URTu#0xad991c68c9f1c6c4f869fa19a217db30aff0f74963ca7e26206f7102b229df5b',
    signature:
      '0xfa71e745c21d7b4ec6f8d54ac5b2fea9bacf91ffb8f56b359a3e5af0119957030a28944011690d404c59ea814c5324298db0ef5b3332868bbdcf33b25bb9f388',
  },
}

const documentLoader = vcjsSuites.combineDocumentLoaders([
  vcjsSuites.documentLoader,
  // we need to add the context url to keys or it won't be accepted
  async (url, dl) => {
    const result = await vcjsSuites.kiltDidLoader(url, dl)
    try {
      const compacted = await jsonld.compact(
        result.document,
        {
          '@context': [
            Did.W3C_DID_CONTEXT_URL,
            Did.KILT_DID_CONTEXT_URL,
            Ed25519Signature2018.CONTEXT_URL,
          ],
        },
        {
          documentLoader: dl,
        }
      )
      return { ...result, document: compacted }
    } catch (e) {
      console.warn(e)
      throw e
    }
  },
  suiteContext.documentLoader,
  SuiteContext2018.documentLoader,
])

;(async () => {
  const api = await connect('wss://spiritnet.kilt.io')
  const keypair = new Keyring({ type: 'ed25519' }).addFromUri('//Alice')
  const did = Did.createLightDidDocument({
    authentication: [keypair],
  })
  console.log('did document', JSON.stringify(did, null, 2))
  const signer = {
    sign: async ({ data }) => keypair.sign(data),
    id: did.uri + did.authentication[0].id,
  }
  const suite = new Ed25519Signature2020({ signer })

  const verifiableCredential = KiltCredentialV1.fromICredential(
    ingos_cred,
    'did:kilt:4pnfkRn5UurBJTW92d9TaVLR2CqJdY4z5HPjrEbpGyBykare',
    api.genesisHash.toU8a(),
    hexToU8a(
      '0x93c4a399abff5a68812479445d121995fde278b7a29d5863259cf7b6b6f1dc7e'
    ),
    1649670060 * 1000
  )

  let presentation = vc.createPresentation({
    verifiableCredential,
    holder: verifiableCredential.credentialSubject.id,
  })

  presentation = await vc.signPresentation({
    presentation,
    suite,
    challenge: '0x1234',
    documentLoader,
  })

  console.log('presentation', JSON.stringify(presentation, null, 2))

  const kiltSuite = new KiltAttestationV1Suite({ api })

  const authPurpose = new AuthenticationProofPurpose({
    challenge: '0x1234',
  })
  const result = await vc.verify({
    presentation,
    suite: [kiltSuite, new Ed25519Signature2020()],
    presentationPurpose: authPurpose,
    purpose: new KiltAttestationProofV1Purpose(),
    documentLoader,
    checkStatus: (args) => kiltSuite.checkStatus(args),
  })

  console.log(JSON.stringify(result, null, 2))
})()
  .catch((e) => console.warn(e))
  .finally(disconnect)

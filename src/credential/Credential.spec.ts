import Identity from '../identity/Identity'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import Credential from './Credential'
import Attestation from '../attestation/Attestation'
import { AttesterIdentity } from '..'
import TConst from '../test/constants'

describe('Credential', () => {
  let claimer: Identity
  let attester: AttesterIdentity
  let ctype: CType
  let reqForAtt: RequestForAttestation
  let attestation: Attestation

  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromMnemonicAndKey(
      TConst.PUBLIC_KEY.toString(),
      TConst.PRIVATE_KEY.toString()
    )
    claimer = await Identity.buildFromMnemonic()

    const rawCType: ICType['schema'] = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    ctype = CType.fromCType({
      schema: rawCType,
      owner: claimer.getAddress(),
      hash: '',
    })

    // cannot be used since the variable needs to be established in the outer scope
    // eslint-disable-next-line prefer-destructuring
    reqForAtt = (await RequestForAttestation.fromClaimAndIdentity({
      claim: Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        claimer.getAddress()
      ),
      identity: claimer,
    }))[0]

    attestation = Attestation.fromRequestAndPublicIdentity(
      reqForAtt,
      attester.getPublicIdentity()
    )
  })

  it('should build from reqForAtt and Attestation', async () => {
    const cred = await Credential.fromRequestAndAttestation(
      claimer,
      reqForAtt,
      attestation
    )
    expect(cred).toBeDefined()
    expect(cred.privacyCredential).toBeNull()
  })

  // should be tested here, but the setup for the privacy enhanced credentials is pretty big
  // It should be covered in the actor tests.
  it.todo(
    'should build from reqForAtt and Attestation with privacy enhancement'
  )

  it('should create AttestedClaim and exclude specific attributes', async () => {
    const cred = await Credential.fromRequestAndAttestation(
      claimer,
      reqForAtt,
      attestation
    )

    const att = cred.createPresentation(['age'])
    expect(att.getAttributes()).toEqual(new Set(['name']))
  })

  it('should get attribute keys', async () => {
    const cred = await Credential.fromRequestAndAttestation(
      claimer,
      reqForAtt,
      attestation
    )
    expect(cred.getAttributes()).toEqual(new Set(['age', 'name']))
  })
})

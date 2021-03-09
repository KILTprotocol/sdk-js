/**
 * @group unit/credential
 */

import {
  Attestation,
  Claim,
  CType,
  Identity,
  RequestForAttestation,
} from '@kiltprotocol/core'
import { ICType } from '@kiltprotocol/types'
import Credential from './Credential'

describe('Credential', () => {
  let claimer: Identity
  let attester: Identity
  let ctype: CType
  let reqForAtt: RequestForAttestation
  let attestation: Attestation

  beforeAll(async () => {
    attester = Identity.buildFromMnemonic(Identity.generateMnemonic())
    claimer = Identity.buildFromMnemonic(Identity.generateMnemonic())

    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'credential',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    ctype = CType.fromSchema(rawCType, claimer.address)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = RequestForAttestation.fromClaimAndIdentity(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        claimer.address
      ),
      claimer
    )

    attestation = Attestation.fromRequestAndPublicIdentity(
      reqForAtt,
      attester.getPublicIdentity()
    )
  })

  it('should build from reqForAtt and Attestation', async () => {
    const cred = await Credential.fromRequestAndAttestation(
      reqForAtt,
      attestation
    )
    expect(cred).toBeDefined()
  })

  // should be tested here, but the setup for the privacy enhanced credentials is pretty big
  // It should be covered in the actor tests.
  it.todo(
    'should build from reqForAtt and Attestation with privacy enhancement'
  )

  it('should create AttestedClaim and exclude specific attributes', async () => {
    const cred = await Credential.fromRequestAndAttestation(
      reqForAtt,
      attestation
    )

    const att = cred.createPresentation(['name'])
    expect(att.getAttributes()).toEqual(new Set(['name']))
  })

  it('should get attribute keys', async () => {
    const cred = await Credential.fromRequestAndAttestation(
      reqForAtt,
      attestation
    )
    expect(cred.getAttributes()).toEqual(new Set(['age', 'name']))
  })
})

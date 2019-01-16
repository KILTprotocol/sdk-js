import Claim from './Claim'
import CType, { ICType } from '../ctype/CType'
import Identity from '../identity/Identity'

describe('Claim', () => {
  const ctype = new CType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    },
    metadata: {
      title: { default: 'CType Title' },
      description: {},
      properties: {
        name: { title: { default: 'Name' } },
      },
    },
  } as ICType)
  const identity = Identity.buildFromSeedString('Alice')

  const claimContents = {
    name: 'Bob',
  }

  const claim = new Claim('testclaim', ctype, claimContents, identity)

  it('signature should be verifiable', () => {
    expect(claim.verifySignature()).toBeTruthy()
  })

  it('can be made with hash', () => {
    expect(
      new Claim('testclaimwithhash', ctype, claimContents, identity, '1234')
    ).toBeDefined()
  })

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromObject(claimObj)).toEqual(claim)
  })
})

import {
  getAttestationHashes,
  getChildIds,
  fetchChildren,
} from '../delegation/Delegation.chain'
import DelegationNode from '../delegation/DelegationNode'
import DelegationRootNode from '../delegation/DelegationRootNode'
import getCached from '../blockchainApiConnection'
import { Attestation, Identity, Did } from '..'
import { getBalance } from '../balance/Balance.chain'
import { getOwner } from '../ctype/CType.chain'
import { queryByAddress, queryByIdentifier } from '../did/Did.chain'
import { decodeDelegationNode } from '../delegation/DelegationDecoder'

const ident = Identity.buildFromMnemonic(Identity.generateMnemonic())
const identAdr = ident.address

test('getAttestationHashes on empty', async () => {
  return expect(getAttestationHashes('0x012012012')).resolves.toEqual([])
})

test('getChildIds on empty', async () => {
  return expect(getChildIds('0x012012012')).resolves.toEqual([])
})

test('DelegationNode query on empty', async () => {
  return expect(DelegationNode.query('0x012012012')).resolves.toBeNull()
})

test('DelegationRootNode.query on empty', async () => {
  return expect(DelegationRootNode.query('0x012012012')).resolves.toBeNull()
})

test('getAttestationHashes on empty', async () => {
  return expect(getAttestationHashes('0x012012012')).resolves.toEqual([])
})

test('fetchChildren on empty', async () => {
  return expect(
    fetchChildren(['0x012012012']).then(res =>
      res.map(el => {
        return { id: el.id, codec: decodeDelegationNode(el.codec) }
      })
    )
  ).resolves.toEqual([{ id: '0x012012012', codec: null }])
})

test('Attestation.query on empty', async () => {
  return expect(Attestation.query('0x012012012')).resolves.toBeNull()
})

test('Attestation.revoke on empty', async () => {
  return expect(
    Attestation.revoke('0x012012012', Identity.buildFromURI('//Alice'))
  ).rejects.toThrow()
})

test('getBalance on empty', async () => {
  return expect(getBalance(identAdr).then(n => n.toNumber())).resolves.toEqual(
    0
  )
})

test('getOwner on new Identity', async () => {
  return expect(getOwner('0x012012012')).resolves.toBeNull()
})

test('queryByAddress on empty', async () => {
  return expect(queryByAddress(identAdr)).resolves.toBeNull()
})

test('queryByIdentifier on empty', async () => {
  return expect(
    queryByIdentifier(Did.fromIdentity(ident).identifier)
  ).resolves.toBeNull()
})

afterAll(async () => {
  getCached().then(bc => {
    bc.api.disconnect()
  })
})

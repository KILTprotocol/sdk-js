import { Tuple, Vec, Option, H256 } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Identity } from '..'
import DelegationNode from './DelegationNode'
import { getAttestationHashes } from './Delegation.chain'
import { Permission } from '../types/Delegation'
import { hashStr } from '../crypto'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
  .__mocked_api

const rootId = hashStr('rootId')
const nodeId = hashStr('myNodeId')
const ctypeHash = hashStr('testCtype')

describe('Delegation', () => {
  let identityAlice: Identity
  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    blockchainApi.query.attestation.delegatedAttestations.mockReturnValue(
      new Vec(
        //  (claim-hash)
        H256,
        [ctypeHash, hashStr('secondTest'), hashStr('thirdTest')]
      )
    )
    blockchainApi.query.delegation.root.mockReturnValue(
      new Option(
        Tuple.with(
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          [H256, AccountId, Bool]
        ),
        [ctypeHash, identityAlice.getAddress(), false]
      )
    )

    blockchainApi.query.delegation.delegations
      // first call
      .mockResolvedValueOnce(
        new Option(Tuple.with([H256, 'Option<H256>', AccountId, U32, Bool]), [
          rootId,
          nodeId,
          identityAlice.getPublicIdentity().address,
          2,
          false,
        ])
      )
      // second call
      .mockResolvedValueOnce(
        new Option(Tuple.with([H256, 'Option<H256>', AccountId, U32, Bool]), [
          rootId,
          nodeId,
          identityAlice.getPublicIdentity().address,
          1,
          false,
        ])
      )
      // third call
      .mockResolvedValueOnce(
        new Option(Tuple.with([H256, 'Option<H256>', AccountId, U32, Bool]), [
          rootId,
          nodeId,
          identityAlice.getPublicIdentity().address,
          0,
          false,
        ])
      )
      // default (any further calls)
      .mockResolvedValue(
        // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
        new Option(Tuple.with([H256, 'Option<H256>', AccountId, U32, Bool]))
      )

    blockchainApi.query.delegation.children.mockResolvedValue(
      new Vec(
        // Children: delegation-id -> [delegation-ids]
        H256,
        [hashStr('firstChild'), hashStr('secondChild'), hashStr('thirdChild')]
      )
    )
  })

  it('get children', async () => {
    const myDelegation = new DelegationNode(
      nodeId,
      rootId,
      identityAlice.getPublicIdentity().address,
      [Permission.ATTEST],
      undefined
    )
    const children: DelegationNode[] = await myDelegation.getChildren()
    expect(children).toHaveLength(3)
    expect(children[0]).toEqual({
      id: hashStr('firstChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    expect(children[1]).toEqual({
      id: hashStr('secondChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.ATTEST],
      revoked: false,
    })
    expect(children[2]).toEqual({
      id: hashStr('thirdChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [],
      revoked: false,
    })
  })
  it('get attestation hashes', async () => {
    const attestationHashes = await getAttestationHashes('myDelegationId')
    expect(attestationHashes).toHaveLength(3)
    expect(attestationHashes).toContain(ctypeHash)
  })
})
